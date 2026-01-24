#!/bin/bash

# iOS Release 构建脚本
# 用于构建并导出 IPA 文件

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始构建 iOS Release 版本...${NC}"

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# iOS 目录
IOS_DIR="$PROJECT_ROOT/ios"
WORKSPACE="$IOS_DIR/SanXing.xcworkspace"
SCHEME="SanXing"
CONFIGURATION="Release"

# 输出目录
BUILD_DIR="$IOS_DIR/build"
ARCHIVE_PATH="$BUILD_DIR/SanXing.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"
IPA_OUTPUT_DIR="$PROJECT_ROOT"

echo -e "${YELLOW}步骤 1: 清理构建目录...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo -e "${YELLOW}步骤 2: 安装 CocoaPods 依赖...${NC}"
cd "$IOS_DIR"
if [ -f "Podfile" ]; then
    # Create build dir if it doesn't exist to ensure codegen happens correctly
    mkdir -p "$BUILD_DIR"
    pod install
else
    echo -e "${RED}错误: 未找到 Podfile${NC}"
    exit 1
fi

echo -e "${YELLOW}步骤 3: 构建 Archive...${NC}"
cd "$PROJECT_ROOT"

xcodebuild clean \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -quiet

xcodebuild archive \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    DEVELOPMENT_TEAM=5XGMJK7H27

if [ ! -d "$ARCHIVE_PATH" ]; then
    echo -e "${RED}错误: Archive 构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}Archive 构建成功: $ARCHIVE_PATH${NC}"

echo -e "${YELLOW}步骤 4: 导出 IPA...${NC}"
# 创建 ExportOptions.plist
EXPORT_OPTIONS_PLIST="$BUILD_DIR/ExportOptions.plist"
cat > "$EXPORT_OPTIONS_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>5XGMJK7H27</string>
</dict>
</plist>
EOF

mkdir -p "$EXPORT_PATH"

xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS_PLIST"

# 查找生成的 IPA 文件
IPA_FILE=$(find "$EXPORT_PATH" -name "*.ipa" | head -n 1)

if [ -z "$IPA_FILE" ]; then
    echo -e "${RED}错误: 未找到生成的 IPA 文件${NC}"
    echo -e "${YELLOW}提示: 请检查代码签名配置，或使用 Xcode 手动导出 IPA${NC}"
    exit 1
fi

# 复制 IPA 到项目根目录
IPA_NAME="SanXing-1.0.ipa"
cp "$IPA_FILE" "$IPA_OUTPUT_DIR/$IPA_NAME"

echo -e "${GREEN}✓ IPA 文件已生成: $IPA_OUTPUT_DIR/$IPA_NAME${NC}"
echo -e "${GREEN}构建完成！${NC}"
echo ""
echo -e "${YELLOW}下一步: 将 IPA 文件上传到 Pushy 平台${NC}"
echo -e "  文件路径: $IPA_OUTPUT_DIR/$IPA_NAME"
echo -e "  版本号: 1.0"
echo -e "  AppKey: fatKukVmb_eKwY4tckoco1CZ"
echo -e "  AppId: 31778"
