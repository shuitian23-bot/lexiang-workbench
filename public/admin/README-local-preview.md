# 乐享 AI 工作台预览说明

这个 `admin` 文件夹可以直接发给其他人预览，不需要真实后端服务。

## 单人本地查看

直接双击打开：

```text
index.html
```

或直接打开：

```text
workbench.html?demo=1
```

页面会进入演示模式，接口数据由 `demo-mock.js` 在浏览器内模拟。

## 同一局域网 / 其他设备查看

如果需要让同一 Wi-Fi / 局域网里的其他电脑、手机访问，请启动本地预览服务。

macOS 双击：

```text
start-preview.command
```

如果系统提示无权限，打开终端进入本文件夹后执行：

```bash
chmod +x start-preview.command start-preview.sh
./start-preview.command
```

Windows 双击：

```text
start-preview.bat
```

启动后窗口会显示两个地址：

```text
本机预览: http://127.0.0.1:4173/admin/workbench.html?demo=1
局域网预览: http://你的局域网IP:4173/admin/workbench.html?demo=1
```

把“局域网预览”地址发给同一网络下的其他设备即可查看。

## 说明

- 预览已直接进入 `workbench.html?demo=1`，不再使用自动刷新预览页。
- 保持启动窗口打开，局域网预览网址才可访问。
- 如果 `4173` 被占用，脚本会自动尝试后续端口，并在窗口中显示真实地址。
- 如果其他设备打不开，请确认双方在同一网络，并允许系统防火墙放行 Python / 本地网络访问。
