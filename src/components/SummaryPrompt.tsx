import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from '@rneui/themed';

interface SummaryPromptProps {
    visible: boolean;
    topOffset: number;
    onConfirm: () => void;
    onCancel: () => void;
    onLayout?: (event: any) => void;
}

const SummaryPrompt: React.FC<SummaryPromptProps> = ({
    visible,
    topOffset,
    onConfirm,
    onCancel,
    onLayout,
}) => {
    const { theme } = useTheme();

    if (!visible) return null;

    return (
        <View
            onLayout={onLayout}
            style={[
                styles.summaryPrompt,
                {
                    backgroundColor: theme.colors.grey0,
                    position: 'absolute',
                    top: topOffset,
                    left: 16,
                    right: 16,
                    zIndex: 100,
                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                }
            ]}>
            <Text style={[styles.summaryText, { color: theme.colors.black }]}>
                🌙 晚安，需要为你生成今日复盘吗？
            </Text>
            <TouchableOpacity
                style={[styles.summaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={onConfirm}
            >
                <Text style={styles.summaryButtonText}>好呀</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.summaryButtonClear}
                onPress={onCancel}
            >
                <Text style={[styles.summaryButtonTextClear, { color: theme.colors.grey2 }]}>下次</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    summaryPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    summaryText: {
        flex: 1,
        fontSize: 14,
    },
    summaryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        marginLeft: 8,
    },
    summaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    summaryButtonClear: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginLeft: 4,
    },
    summaryButtonTextClear: {
        fontSize: 14,
    },
});

export default SummaryPrompt;
