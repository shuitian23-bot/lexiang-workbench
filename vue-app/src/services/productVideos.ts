export type VideoStatus = 'inactive' | 'active' | 'stopped'
export type VideoPosition = 'showcase' | 'detail'

export interface VideoCoverAsset {
  position: VideoPosition
  kind: 'primary' | 'mobile'
  name: string
  resolution: string
  url: string
}

export interface ProductVideoRecord {
  id: string
  materialCode: string
  productCode: string
  mall: string
  productName: string
  owner: string
  positions: VideoPosition[]
  status: VideoStatus
  creatorAccount: string
  createdAt: string
  operator: string
  operatorAccount: string
  operatedAt: string
  videoName: string
  folder: string
  objectKey: string
  cdnUrl: string
  covers: VideoCoverAsset[]
}

export interface VideoFilters {
  keyword: string
  mall: string
  status: VideoStatus | 'all'
  owner: string
  position: VideoPosition | 'all'
  creator: string
}

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  inactive: '未启用',
  active: '已启用',
  stopped: '已停用'
}

export const VIDEO_POSITION_LABELS: Record<VideoPosition, string> = {
  showcase: '橱窗图视频',
  detail: '商详页开箱视频'
}

export const BU_OWNER_OPTIONS = [
  'Lenovo_None',
  'Lenovo_PC',
  'Lenovo_MBG',
  'Lenovo_Service',
  'Lenovo_Pad',
  'Lenovo_Think',
  'Lenovo_TV',
  'Lenovo_Rmodel',
  'DongDe',
  'Lenovo_MBG_Service',
  'Lenovo_Option',
  'Think_Option',
  'Lenovo_Printer',
  'DongDe_NO_Number',
  'SMB_Integral_Mall',
  'SMB_Direct_Market',
  'SMB_Agent_Market',
  'PCSD',
  'Moto'
] as const

export const MATERIAL_OPTIONS = [
  {
    code: '21M5003PCD',
    name: 'ThinkPad T14p AI 2026',
    owner: 'Lenovo_Think',
    links: [
      ['G-T14P-01', '联想商城'],
      ['EPP-T14P-01', 'Epp 聚享汇']
    ]
  },
  {
    code: '83DF004RCD',
    name: '小新 Pro 16 2026',
    owner: 'Lenovo_PC',
    links: [['G-XP16-02', '联想商城']]
  },
  {
    code: '90YQ0038CD',
    name: '拯救者 刃 9000K 2026',
    owner: 'Lenovo_MBG_Service',
    links: [
      ['G-R9000K-03', '联想商城'],
      ['EPP-R9000K-08', 'Epp 聚享汇']
    ]
  }
]

let records: ProductVideoRecord[] = [
  {
    id: 'VC-260812-001',
    materialCode: '21M5003PCD',
    productCode: 'G-T14P-01',
    mall: '联想商城',
    productName: 'ThinkPad T14p AI 2026',
    owner: 'Lenovo_Think',
    positions: ['showcase', 'detail'],
    status: 'active',
    creatorAccount: 'wangxy8',
    createdAt: '2026-08-12 09:20',
    operator: '王晓雨',
    operatorAccount: 'wangxy8',
    operatedAt: '2026-08-16 14:32',
    videoName: 't14p-launch.mp4',
    folder: 'consumer-1257188835/cckx',
    objectKey: 'consumer-1257188835/cckx/21M5003PCD/t14p-launch.mp4',
    cdnUrl: 'https://media.example.lenovo.com/cckx/21M5003PCD/t14p-launch.mp4',
    covers: [
      {
        position: 'showcase',
        kind: 'primary',
        name: 't14p-showcase-cover.jpg',
        resolution: '800×800',
        url: 'https://media.example.lenovo.com/covers/21M5003PCD/t14p-showcase-cover.jpg'
      },
      {
        position: 'detail',
        kind: 'primary',
        name: 't14p-detail-pc.jpg',
        resolution: '1920×1080',
        url: 'https://media.example.lenovo.com/covers/21M5003PCD/t14p-detail-pc.jpg'
      },
      {
        position: 'detail',
        kind: 'mobile',
        name: 't14p-detail-mobile.jpg',
        resolution: '750×422',
        url: 'https://media.example.lenovo.com/covers/21M5003PCD/t14p-detail-mobile.jpg'
      }
    ]
  },
  {
    id: 'VC-260812-002',
    materialCode: '83DF004RCD',
    productCode: 'G-XP16-02',
    mall: '联想商城',
    productName: '小新 Pro 16 2026',
    owner: 'Lenovo_PC',
    positions: ['detail'],
    status: 'inactive',
    creatorAccount: 'lili21',
    createdAt: '2026-08-14 10:16',
    operator: '李莉',
    operatorAccount: 'lili21',
    operatedAt: '2026-08-16 11:08',
    videoName: 'xiaoxin-unbox.mp4',
    folder: 'consumer-1257188835/spxq/kxsp',
    objectKey: 'consumer-1257188835/spxq/kxsp/83DF004RCD/xiaoxin-unbox.mp4',
    cdnUrl: 'https://media.example.lenovo.com/spxq/kxsp/83DF004RCD/xiaoxin-unbox.mp4',
    covers: [
      {
        position: 'detail',
        kind: 'primary',
        name: 'xiaoxin-detail-pc.jpg',
        resolution: '1920×1080',
        url: 'https://media.example.lenovo.com/covers/83DF004RCD/xiaoxin-detail-pc.jpg'
      },
      {
        position: 'detail',
        kind: 'mobile',
        name: 'xiaoxin-detail-mobile.jpg',
        resolution: '750×422',
        url: 'https://media.example.lenovo.com/covers/83DF004RCD/xiaoxin-detail-mobile.jpg'
      }
    ]
  },
  {
    id: 'VC-260812-003',
    materialCode: '90YQ0038CD',
    productCode: 'G-R9000K-03',
    mall: 'Epp 聚享汇',
    productName: '拯救者 刃 9000K 2026',
    owner: 'Lenovo_MBG_Service',
    positions: ['showcase'],
    status: 'stopped',
    creatorAccount: 'zhangyu5',
    createdAt: '2026-08-15 15:08',
    operator: '张予',
    operatorAccount: 'zhangyu5',
    operatedAt: '2026-08-15 17:46',
    videoName: 'r9000k-showcase.mp4',
    folder: 'consumer-1257188835/cckx',
    objectKey: 'consumer-1257188835/cckx/90YQ0038CD/r9000k-showcase.mp4',
    cdnUrl: 'https://media.example.lenovo.com/cckx/90YQ0038CD/r9000k-showcase.mp4',
    covers: [
      {
        position: 'showcase',
        kind: 'primary',
        name: 'r9000k-showcase-cover.jpg',
        resolution: '800×800',
        url: 'https://media.example.lenovo.com/covers/90YQ0038CD/r9000k-showcase-cover.jpg'
      }
    ]
  }
]

export function listProductVideos(filters: VideoFilters) {
  const q = filters.keyword.trim().toLowerCase()
  return records.filter(
    (row) =>
      (!q ||
        row.materialCode.toLowerCase().includes(q) ||
        row.productCode.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q)) &&
      (filters.mall === 'all' || row.mall === filters.mall) &&
      (filters.status === 'all' || row.status === filters.status) &&
      (filters.owner === 'all' || row.owner === filters.owner) &&
      (filters.position === 'all' || row.positions.includes(filters.position)) &&
      (!filters.creator.trim() ||
        row.creatorAccount.toLowerCase().includes(filters.creator.trim().toLowerCase()))
  )
}

export function updateVideoStatus(id: string, status: VideoStatus) {
  records = records.map((row) =>
    row.id === id
      ? {
          ...row,
          status,
          operator: '当前用户',
          operatorAccount: 'demo',
          operatedAt: '2026-08-17 12:30'
        }
      : row
  )
}

export function saveProductVideo(record: ProductVideoRecord) {
  const index = records.findIndex((item) => item.id === record.id)
  if (index >= 0) records[index] = record
  else records = [record, ...records]
}
