// ── 火山豆包流式语音识别 2.0（Seed ASR Streaming / bigmodel）代理 ──────────────
// 语音控制的识别层后端：前端录音 → POST /api/asr（二进制音频）→ 本代理连火山流式
// WebSocket 一次性发完音频、收 final 文字 → 返回 {text}。Access Token 只留后端，不进前端。
//
// 火山协议（wss .../api/v3/sauc/bigmodel）是二进制帧：
//   [4B header][4B sequence][4B payload size][payload(gzip)]
//   header: (proto_ver<<4|header_size) (msg_type<<4|flags) (serialization<<4|compression) reserved
//   full client request  msg_type=0b0001  flags=0b0001(带正序号)
//   audio only request   msg_type=0b0010  flags=0b0001(中间) / 0b0011(末包,序号取负)
//   full server response msg_type=0b1001   error response msg_type=0b1111
const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const zlib = require('zlib');
const crypto = require('crypto');

const APP_ID = process.env.VOLC_ASR_APP_ID;
const ACCESS_TOKEN = process.env.VOLC_ASR_ACCESS_TOKEN;
const RESOURCE_ID = process.env.VOLC_ASR_RESOURCE_ID || 'volc.bigasr.sauc.duration';
const ASR_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';

function header(msgType, flags, ser = 0b0001, comp = 0b0001) {
  return Buffer.from([(0b0001 << 4) | 0b0001, (msgType << 4) | flags, (ser << 4) | comp, 0x00]);
}
function int32be(n) { const b = Buffer.alloc(4); b.writeInt32BE(n, 0); return b; }

function buildFullClientRequest(seq, audioCfg) {
  const payload = zlib.gzipSync(Buffer.from(JSON.stringify({
    user: { uid: 'lexiang-voice' },
    audio: audioCfg,
    request: { model_name: 'bigmodel', enable_punc: true, show_utterances: false },
  })));
  return Buffer.concat([header(0b0001, 0b0001), int32be(seq), int32be(payload.length), payload]);
}
function buildAudioRequest(chunk, seq, last) {
  const payload = zlib.gzipSync(chunk);
  return Buffer.concat([header(0b0010, last ? 0b0011 : 0b0001), int32be(last ? -seq : seq), int32be(payload.length), payload]);
}

function parseResponse(data) {
  const b0 = data[0], b1 = data[1], b2 = data[2];
  const headerSize = (b0 & 0x0f) * 4;
  const msgType = (b1 >> 4) & 0x0f;
  const flags = b1 & 0x0f;
  const comp = b2 & 0x0f;
  let off = headerSize;
  const res = { msgType, isLast: !!(flags & 0b0010) };
  if (flags & 0b0001) { res.seq = data.readInt32BE(off); off += 4; if (res.seq < 0) res.isLast = true; }
  if (msgType === 0b1111) {                          // error response
    res.code = data.readUInt32BE(off); off += 4;
    const sz = data.readUInt32BE(off); off += 4;
    res.errMsg = data.slice(off, off + sz).toString('utf8');
    return res;
  }
  if (off + 4 > data.length) return res;
  const sz = data.readUInt32BE(off); off += 4;
  let payload = data.slice(off, off + sz);
  if (comp === 0b0001 && payload.length) { try { payload = zlib.gunzipSync(payload); } catch (_e) {} }
  try { res.json = JSON.parse(payload.toString('utf8')); } catch (_e) { res.raw = payload.toString('utf8'); }
  return res;
}

function extractText(json) {
  if (!json || !json.result) return '';
  const r = json.result;
  if (typeof r.text === 'string' && r.text) return r.text;
  if (Array.isArray(r.utterances)) return r.utterances.map((u) => u.text || '').join('');
  return '';
}

function recognize(audio, audioCfg) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(ASR_URL, {
      headers: {
        'X-Api-App-Key': APP_ID,
        'X-Api-Access-Key': ACCESS_TOKEN,
        'X-Api-Resource-Id': RESOURCE_ID,
        'X-Api-Connect-Id': crypto.randomUUID(),
      },
    });
    let finalText = '';
    let settled = false;
    const done = (err, text) => { if (settled) return; settled = true; try { ws.close(); } catch (_e) {} err ? reject(err) : resolve(text); };
    const timer = setTimeout(() => done(new Error('ASR 超时')), 15000);

    ws.on('open', () => {
      let seq = 1;
      ws.send(buildFullClientRequest(seq, audioCfg));
      const CHUNK = 12800;                            // ≈0.4s @16k/16bit，分片发
      const parts = [];
      for (let i = 0; i < audio.length; i += CHUNK) parts.push(audio.slice(i, i + CHUNK));
      if (!parts.length) parts.push(Buffer.alloc(0));
      parts.forEach((c, idx) => { seq++; ws.send(buildAudioRequest(c, seq, idx === parts.length - 1)); });
    });
    ws.on('message', (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      let r;
      try { r = parseResponse(buf); } catch (_e) { return; }
      if (r.msgType === 0b1111) { clearTimeout(timer); return done(new Error('火山ASR ' + r.code + ' ' + (r.errMsg || ''))); }
      const t = extractText(r.json);
      if (t) finalText = t;
      if (r.isLast) { clearTimeout(timer); done(null, finalText); }
    });
    ws.on('error', (e) => { clearTimeout(timer); done(new Error('WS ' + ((e && e.message) || e))); });
    ws.on('close', () => { clearTimeout(timer); done(null, finalText); });
  });
}

// POST /api/asr — body 为二进制音频；?format=wav|pcm|mp3|ogg &rate=16000
router.post('/', express.raw({ type: '*/*', limit: '12mb' }), async (req, res) => {
  if (!APP_ID || !ACCESS_TOKEN) return res.status(500).json({ error: 'ASR 未配置（缺 VOLC_ASR 凭据）' });
  const audio = req.body;
  if (!audio || !audio.length) return res.status(400).json({ error: '缺少音频数据' });
  const format = String(req.query.format || 'wav').toLowerCase();
  const rate = Number(req.query.rate) || 16000;
  const audioCfg = { format, rate, bits: 16, channel: 1 };
  try {
    const text = await recognize(audio, audioCfg);
    res.json({ text: (text || '').trim() });
  } catch (e) {
    res.status(502).json({ error: (e && e.message) || 'ASR 失败' });
  }
});

module.exports = router;
