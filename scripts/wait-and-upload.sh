#!/bin/bash

# 等待构建完成并上传 IPA 的脚本

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "等待构建完成..."
MAX_WAIT=3600  # 最多等待 1 小时
WAITED=0
CHECK_INTERVAL=30

while [ $WAITED -lt $MAX_WAIT ]; do
    # 检查构建进程
    if ! ps aux | grep -E "xcodebuild.*archive" | grep -v grep > /dev/null; then
        echo "构建进程已结束，检查结果..."
        sleep 5
        
        # 查找 IPA 文件
        IPA_FILE=$(find "$PROJECT_ROOT" -name "*.ipa" -type f -mmin -60 2>/dev/null | head -n 1)
        
        if [ -n "$IPA_FILE" ] && [ -f "$IPA_FILE" ]; then
            echo "找到 IPA 文件: $IPA_FILE"
            echo "开始上传到 Pushy..."
            bash "$PROJECT_ROOT/scripts/upload-to-pushy.sh"
            exit 0
        else
            # 检查 Archive
            if [ -d "ios/build/SanXing.xcarchive" ]; then
                echo "找到 Archive，开始导出 IPA..."
                cd ios
                xcodebuild -exportArchive \
                    -archivePath build/SanXing.xcarchive \
                    -exportPath build/export \
                    -exportOptionsPlist build/ExportOptions.plist
                
                IPA_FILE=$(find build/export -name "*.ipa" -type f | head -n 1)
                if [ -n "$IPA_FILE" ]; then
                    cp "$IPA_FILE" "$PROJECT_ROOT/SanXing-1.0.ipa"
                    echo "IPA 已导出，开始上传..."
                    bash "$PROJECT_ROOT/scripts/upload-to-pushy.sh"
                    exit 0
                fi
            fi
        fi
        
        echo "构建完成但未找到 IPA 文件，请检查构建日志"
        tail -50 /tmp/build.log 2>/dev/null | tail -20
        exit 1
    fi
    
    sleep $CHECK_INTERVAL
    WAITED=$((WAITED + CHECK_INTERVAL))
    echo "已等待 ${WAITED} 秒，构建仍在进行中..."
done

echo "等待超时，构建可能仍在进行中"
exit 1
