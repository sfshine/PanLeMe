#!/bin/bash

# iOS 完整构建和安装脚本
# 功能：打包 JS Bundle -> 编译 Release IPA -> 安装到连接的 iOS 设备 -> 自动打开应用

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# iOS 配置
IOS_DIR="$PROJECT_ROOT/ios"
BUNDLE_ID="org.reactjs.native.example.SanXing"
APP_NAME="SanXing"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  iOS 完整构建和安装流程${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查必要的工具
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}错误: 未找到 $1${NC}"
        echo -e "${YELLOW}请安装: $2${NC}"
        return 1
    fi
    return 0
}

# 检查 iOS 设备连接
check_ios_device() {
    echo -e "${YELLOW}检查连接的 iOS 设备...${NC}"
    
    # 优先尝试使用 ios-deploy（支持安装和启动）
    if command -v ios-deploy &> /dev/null; then
        if ios-deploy --detect 2>&1 | grep -q "Found"; then
            echo -e "${GREEN}✓ 找到连接的 iOS 设备（使用 ios-deploy）${NC}"
            DEPLOY_TOOL="ios-deploy"
            return 0
        fi
    fi
    
    # 尝试使用 xcrun devicectl（Xcode 15+ 官方工具）
    if command -v xcrun &> /dev/null; then
        if xcrun devicectl list devices 2>&1 | grep -q "device"; then
            echo -e "${GREEN}✓ 找到连接的 iOS 设备（使用 xcrun devicectl）${NC}"
            DEPLOY_TOOL="devicectl"
            return 0
        fi
    fi
    
    # 尝试使用 ideviceinstaller
    if command -v ideviceinstaller &> /dev/null && command -v idevice_id &> /dev/null; then
        DEVICE_COUNT=$(idevice_id -l 2>/dev/null | wc -l | tr -d ' ')
        if [ "$DEVICE_COUNT" -gt 0 ]; then
            echo -e "${GREEN}✓ 找到连接的 iOS 设备（使用 ideviceinstaller）${NC}"
            DEPLOY_TOOL="ideviceinstaller"
            return 0
        fi
    fi
    
    # 尝试使用 xcrun simctl（模拟器）
    if command -v xcrun &> /dev/null; then
        SIMULATOR_COUNT=$(xcrun simctl list devices available 2>/dev/null | grep -c "iPhone" || echo "0")
        if [ "$SIMULATOR_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}⚠ 未找到真机，但检测到模拟器${NC}"
            echo -e "${YELLOW}提示: 本脚本主要用于真机安装，模拟器请使用: react-native run-ios${NC}"
        fi
    fi
    
    echo -e "${RED}错误: 未找到连接的 iOS 设备${NC}"
    echo -e "${YELLOW}请确保:${NC}"
    echo -e "  1. iOS 设备已通过 USB 连接到 Mac"
    echo -e "  2. 设备已解锁并信任此电脑"
    echo -e "  3. 已安装 ios-deploy 或 ideviceinstaller"
    echo ""
    echo -e "${YELLOW}安装工具（推荐 ios-deploy）:${NC}"
    echo -e "  ios-deploy: brew install ios-deploy"
    echo -e "  ideviceinstaller: brew install ideviceinstaller"
    return 1
}

# 步骤 1: 打包 JS Bundle
step1_bundle_js() {
    echo ""
    echo -e "${BLUE}步骤 1: 打包 JS Bundle${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    # 检查 pushy CLI
    if ! command -v pushy &> /dev/null; then
        echo -e "${RED}错误: 未找到 pushy CLI${NC}"
        echo -e "${YELLOW}请安装: npm install -g react-native-update-cli${NC}"
        return 1
    fi
    
    # 检查 update.json
    if [ ! -f "$PROJECT_ROOT/update.json" ]; then
        echo -e "${RED}错误: 未找到 update.json 配置文件${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}使用 pushy bundle 打包 JS Bundle...${NC}"
    
    # 使用 pushy bundle 命令打包（非交互式）
    echo -e "ios\nN" | pushy bundle
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ JS Bundle 打包失败${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ JS Bundle 打包成功${NC}"
    return 0
}

# 步骤 2: 编译 Release IPA
step2_build_ipa() {
    echo ""
    echo -e "${BLUE}步骤 2: 编译 Release IPA${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    # 调用现有的构建脚本
    bash "$PROJECT_ROOT/scripts/build-ios-release.sh"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ IPA 构建失败${NC}"
        return 1
    fi
    
    # 查找生成的 IPA 文件
    IPA_FILE=$(find "$PROJECT_ROOT" -maxdepth 1 -name "SanXing-*.ipa" | head -n 1)
    
    if [ -z "$IPA_FILE" ] || [ ! -f "$IPA_FILE" ]; then
        echo -e "${RED}错误: 未找到生成的 IPA 文件${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ IPA 文件已生成: $IPA_FILE${NC}"
    IPA_PATH="$IPA_FILE"
    return 0
}

# 步骤 3: 安装到 iOS 设备
step3_install_to_device() {
    echo ""
    echo -e "${BLUE}步骤 3: 安装到 iOS 设备${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    if [ -z "$IPA_PATH" ] || [ ! -f "$IPA_PATH" ]; then
        echo -e "${RED}错误: IPA 文件不存在${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}正在安装 IPA 到设备...${NC}"
    
    if [ "$DEPLOY_TOOL" = "ios-deploy" ]; then
        # 使用 ios-deploy 安装
        ios-deploy --bundle "$IPA_PATH" --noninteractive
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ 安装失败${NC}"
            return 1
        fi
        
        echo -e "${GREEN}✓ 安装成功${NC}"
        return 0
        
    elif [ "$DEPLOY_TOOL" = "devicectl" ]; then
        # 使用 xcrun devicectl 安装
        # 获取设备 UDID
        DEVICE_UDID=$(xcrun devicectl list devices 2>/dev/null | grep -i "iphone" | head -n 1 | awk '{print $NF}' || echo "")
        
        if [ -z "$DEVICE_UDID" ]; then
            echo -e "${RED}错误: 无法获取设备 UDID${NC}"
            return 1
        fi
        
        xcrun devicectl device install app --device "$DEVICE_UDID" "$IPA_PATH"
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ 安装失败${NC}"
            return 1
        fi
        
        echo -e "${GREEN}✓ 安装成功${NC}"
        return 0
        
    elif [ "$DEPLOY_TOOL" = "ideviceinstaller" ]; then
        # 使用 ideviceinstaller 安装
        ideviceinstaller -i "$IPA_PATH"
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ 安装失败${NC}"
            return 1
        fi
        
        echo -e "${GREEN}✓ 安装成功${NC}"
        return 0
    else
        echo -e "${RED}错误: 未找到可用的安装工具${NC}"
        return 1
    fi
}

# 步骤 4: 打开应用
step4_launch_app() {
    echo ""
    echo -e "${BLUE}步骤 4: 启动应用${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    echo -e "${YELLOW}正在启动应用...${NC}"
    
    if [ "$DEPLOY_TOOL" = "ios-deploy" ]; then
        # 使用 ios-deploy 启动应用
        ios-deploy --bundle_id "$BUNDLE_ID" --justlaunch
        
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}⚠ 自动启动失败，请手动打开应用${NC}"
            return 0
        fi
        
        echo -e "${GREEN}✓ 应用已启动${NC}"
        return 0
        
    elif [ "$DEPLOY_TOOL" = "devicectl" ]; then
        # 使用 xcrun devicectl 启动应用
        DEVICE_UDID=$(xcrun devicectl list devices 2>/dev/null | grep -i "iphone" | head -n 1 | awk '{print $NF}' || echo "")
        
        if [ -z "$DEVICE_UDID" ]; then
            echo -e "${YELLOW}⚠ 无法获取设备 UDID，请手动打开应用${NC}"
            return 0
        fi
        
        xcrun devicectl device process launch --device "$DEVICE_UDID" "$BUNDLE_ID" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ 应用已启动${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ 自动启动失败，请手动打开应用${NC}"
            return 0
        fi
        
    elif [ "$DEPLOY_TOOL" = "ideviceinstaller" ]; then
        # ideviceinstaller 不支持启动，尝试使用其他方法
        # 尝试使用 ios-deploy（如果可用）
        if command -v ios-deploy &> /dev/null; then
            ios-deploy --bundle_id "$BUNDLE_ID" --justlaunch 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ 应用已启动（使用 ios-deploy）${NC}"
                return 0
            fi
        fi
        
        echo -e "${YELLOW}⚠ 无法自动启动应用，请手动打开${NC}"
        echo -e "${YELLOW}提示: 安装 ios-deploy (brew install ios-deploy) 以获得自动启动功能${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ 无法自动启动应用，请手动打开${NC}"
        return 0
    fi
}

# 主流程
main() {
    # 检查工具
    if ! check_ios_device; then
        exit 1
    fi
    
    # 执行步骤
    if ! step1_bundle_js; then
        exit 1
    fi
    
    if ! step2_build_ipa; then
        exit 1
    fi
    
    if ! step3_install_to_device; then
        exit 1
    fi
    
    if ! step4_launch_app; then
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  所有步骤完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}✓ JS Bundle 已打包${NC}"
    echo -e "${GREEN}✓ Release IPA 已编译${NC}"
    echo -e "${GREEN}✓ 应用已安装到设备${NC}"
    echo -e "${GREEN}✓ 应用已启动${NC}"
    echo ""
}

# 运行主流程
main
