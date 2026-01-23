#!/bin/bash

# 打包并上传 JS Bundle 到 Pushy iOS 平台的脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置信息（从 update.json 读取）
APP_ID=31778
APP_KEY="fatKukVmb_eKwY4tckoco1CZ"
PLATFORM="ios"

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}开始打包并上传 JS Bundle 到 Pushy iOS 平台...${NC}"
echo ""

# 检查 pushy CLI
if ! command -v pushy &> /dev/null; then
    echo -e "${RED}错误: 未找到 pushy CLI${NC}"
    echo -e "${YELLOW}请安装: npm install -g react-native-update-cli${NC}"
    exit 1
fi

# 检查 update.json
if [ ! -f "$PROJECT_ROOT/update.json" ]; then
    echo -e "${RED}错误: 未找到 update.json 配置文件${NC}"
    exit 1
fi

echo -e "${GREEN}配置信息:${NC}"
echo -e "  平台: iOS"
echo -e "  AppId: $APP_ID"
echo -e "  AppKey: $APP_KEY"
echo ""

# 步骤1: 打包 JS Bundle
echo -e "${YELLOW}步骤 1: 打包 JS Bundle...${NC}"

# 使用 pushy bundle 命令打包（非交互式，自动输入 ios，然后输入 N 不立即上传）
# pushy bundle 会自动读取 update.json 中的配置
echo -e "ios\nN" | pushy bundle

BUNDLE_EXIT_CODE=$?

if [ $BUNDLE_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}✗ JS Bundle 打包失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ JS Bundle 打包成功${NC}"
echo ""

# 查找生成的 ppk 文件
PPK_FILE=$(find "$PROJECT_ROOT/.pushy/output" -name "ios.*.ppk" -type f | sort -r | head -n 1)

if [ -z "$PPK_FILE" ] || [ ! -f "$PPK_FILE" ]; then
    echo -e "${RED}错误: 未找到生成的 ppk 文件${NC}"
    exit 1
fi

echo -e "${GREEN}找到更新包: $PPK_FILE${NC}"
echo -e "${YELLOW}文件大小: $(du -h "$PPK_FILE" | cut -f1)${NC}"
echo ""

# 步骤2: 上传到 Pushy
echo -e "${YELLOW}步骤 2: 上传到 Pushy 平台...${NC}"

# 使用 pushy publish 命令上传 ppk 文件
pushy publish "$PPK_FILE" --platform ios

PUBLISH_EXIT_CODE=$?

if [ $PUBLISH_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ JS Bundle 上传成功！${NC}"
    echo -e "${GREEN}热更新包已发布到 Pushy iOS 平台${NC}"
    echo ""
    echo -e "${YELLOW}提示: 用户打开应用时会自动检查并下载更新${NC}"
else
    echo ""
    echo -e "${RED}✗ JS Bundle 上传失败${NC}"
    exit 1
fi
