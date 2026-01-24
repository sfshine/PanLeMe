import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, StatusBar } from 'react-native';
import { Icon, useTheme } from '@rneui/themed';

interface MessageContextMenuProps {
    visible: boolean;
    onClose: () => void;
    onCopy: () => void;
    onDelete: () => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
    visible,
    onClose,
    onCopy,
    onDelete,
}) => {
    const { theme } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true} // Allow drawing over status bar on Android
        >
            <StatusBar backgroundColor="transparent" barStyle="light-content" translucent={true} />
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={[styles.menuContainer, { backgroundColor: theme.colors.white }]}>
                    <View style={styles.menuHandle} />

                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomColor: theme.colors.grey5, borderBottomWidth: 0.5 }]}
                        onPress={onCopy}
                    >
                        <Icon name="copy" type="feather" size={20} color={theme.colors.black} />
                        <Text style={[styles.menuText, { color: theme.colors.black }]}>复制</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomColor: theme.colors.grey5 }]}
                        onPress={onDelete}
                    >
                        <Icon name="trash-2" type="feather" size={20} color={theme.colors.error} />
                        <Text style={[styles.menuText, { color: theme.colors.error }]}>删除</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuCancel, { backgroundColor: theme.colors.grey1 }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.menuText, { color: theme.colors.black, fontWeight: '600' }]}>取消</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        paddingBottom: 32, // Check safe area if needed, but often ample padding is enough
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    menuHandle: {
        width: 36,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
    },
    menuCancel: {
        marginTop: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
});
