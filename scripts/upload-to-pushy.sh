#!/bin/bash

# 上传 IPA 到 Pushy 的脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置信息
APP_ID=31778
APP_KEY="fatKukVmb_eKwY4tckoco1CZ"
VERSION="1.0"

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 查找 IPA 文件
IPA_FILE=""
if [ -f "SanXing-1.0.ipa" ]; then
    IPA_FILE="$PROJECT_ROOT/SanXing-1.0.ipa"
elif [ -f "ios/build/export/SanXing.ipa" ]; then
    IPA_FILE="$PROJECT_ROOT/ios/build/export/SanXing.ipa"
else
    # 查找任何 IPA 文件
    IPA_FILE=$(find "$PROJECT_ROOT" -name "*.ipa" -type f | head -n 1)
fi

if [ -z "$IPA_FILE" ] || [ ! -f "$IPA_FILE" ]; then
    echo -e "${RED}错误: 未找到 IPA 文件${NC}"
    echo -e "${YELLOW}请先构建 IPA 文件${NC}"
    exit 1
fi

echo -e "${GREEN}找到 IPA 文件: $IPA_FILE${NC}"
echo -e "${YELLOW}文件大小: $(du -h "$IPA_FILE" | cut -f1)${NC}"
echo ""

# 检查 pushy CLI
if ! command -v pushy &> /dev/null; then
    echo -e "${RED}错误: 未找到 pushy CLI${NC}"
    echo -e "${YELLOW}请安装: npm install -g react-native-update-cli${NC}"
    exit 1
fi

echo -e "${GREEN}开始上传 IPA 到 Pushy...${NC}"
echo -e "  AppId: $APP_ID"
echo -e "  AppKey: $APP_KEY"
echo -e "  版本号: $VERSION"
echo -e "  IPA 文件: $IPA_FILE"
echo ""

# 使用 pushy uploadIpa 命令上传
# pushy uploadIpa 只需要 IPA 文件路径，appId 和 appKey 会从 update.json 读取
pushy uploadIpa "$IPA_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ IPA 上传成功！${NC}"
    echo -e "${GREEN}版本 $VERSION 已发布到 Pushy 平台${NC}"
else
    echo ""
    echo -e "${RED}✗ IPA 上传失败${NC}"
    exit 1
fi
