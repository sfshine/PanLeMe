# Pushy iOS IPA 上传指南

## 配置信息

- **AppId**: 31778
- **AppKey**: fatKukVmb_eKwY4tckoco1CZ
- **版本号**: 1.0

## 方法一：使用构建脚本（推荐）

### 1. 构建 IPA

```bash
npm run build:ios:release
# 或
yarn build:ios:release
```

脚本会自动：
- 清理构建目录
- 安装 CocoaPods 依赖
- 构建 Release Archive
- 导出 IPA 文件

生成的 IPA 文件位于项目根目录：`SanXing-1.0.ipa`

### 2. 上传到 Pushy

#### 方式 A：通过 Pushy 网页平台

1. 登录 [Pushy 平台](https://pushy.me)
2. 选择 iOS 应用（AppId: 31778）
3. 进入"版本管理"或"上传版本"页面
4. 上传 `SanXing-1.0.ipa` 文件
5. 设置版本号为 `1.0`
6. 确认上传

#### 方式 B：使用 Pushy CLI（如果已安装）

```bash
pushy upload-ipa SanXing-1.0.ipa \
  --app-id 31778 \
  --app-key fatKukVmb_eKwY4tckoco1CZ \
  --version 1.0
```

## 方法二：使用 Xcode 手动构建

### 1. 打开项目

```bash
open ios/SanXing.xcworkspace
```

### 2. 配置构建

- 选择 "Any iOS Device (arm64)" 作为目标设备
- 确保 Scheme 选择为 "SanXing"
- 确保 Configuration 为 "Release"

### 3. 创建 Archive

1. 菜单：`Product` → `Archive`
2. 等待构建完成

### 4. 导出 IPA

1. Archive 完成后，会自动打开 Organizer 窗口
2. 选择刚创建的 Archive
3. 点击 `Distribute App`
4. 选择导出方式（Development/Ad Hoc/App Store）
5. 选择导出选项
6. 导出 IPA 文件

### 5. 上传到 Pushy

参考"方法一"中的上传步骤。

## 验证

上传成功后，可以在 Pushy 平台查看：
- 版本信息
- 下载链接
- 更新日志

## 注意事项

1. **代码签名**：确保使用有效的开发者证书和描述文件
2. **版本号**：确保 Xcode 项目中的 MARKETING_VERSION (1.0) 与上传的版本号一致
3. **Bundle ID**：当前为 `org.reactjs.native.example.SanXing`
4. **Team ID**：5XGMJK7H27

## 故障排除

### 构建失败

- 检查 CocoaPods 依赖是否已安装：`cd ios && bundle exec pod install`
- 检查代码签名配置是否正确
- 检查 Xcode 版本是否兼容

### 上传失败

- 确认 AppKey 和 AppId 正确
- 确认 IPA 文件未损坏
- 检查网络连接
- 查看 Pushy 平台的错误提示
