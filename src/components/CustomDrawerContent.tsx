import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { chatStore } from '../store/ChatStore';
import { userStore } from '../store/UserStore';

export const CustomDrawerContent = observer((props: any) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const handleNewSession = () => {
        chatStore.startNewSession();
        props.navigation.closeDrawer();
    };

    const handleSelectSession = (id: string) => {
        chatStore.loadSession(id);
        props.navigation.closeDrawer();
    };

    const handleDeleteSession = (id: string) => {
        Alert.alert('删除', '确定删除这个会话吗？', [
            { text: '取消' },
            { text: '删除', style: 'destructive', onPress: () => chatStore.deleteSession(id) }
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.grey3 }]}>
            {/* New Chat Button */}
            <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
                <TouchableOpacity
                    style={[styles.newChatButton, { borderColor: theme.colors.grey5 }]}
                    onPress={handleNewSession}
                    activeOpacity={0.7}
                >
                    <Icon name="plus" type="feather" color={theme.colors.black} size={18} />
                    <Text style={[styles.newChatText, { color: theme.colors.black }]}>新会话</Text>
                </TouchableOpacity>
            </View>

            {/* Sessions List */}
            <DrawerContentScrollView {...props} style={styles.scrollView}>
                {chatStore.sessions.length > 0 && (
                    <Text style={[styles.sectionTitle, { color: theme.colors.grey2 }]}>历史记录</Text>
                )}
                {chatStore.sessions.map((session) => (
                    <TouchableOpacity
                        key={session.id}
                        style={[
                            styles.sessionItem,
                            chatStore.currentSessionId === session.id && { backgroundColor: theme.colors.grey4 }
                        ]}
                        onPress={() => handleSelectSession(session.id)}
                        onLongPress={() => handleDeleteSession(session.id)}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name={session.type === 'happy' ? 'smile' : 'book'}
                            type="feather"
                            color={theme.colors.grey2}
                            size={16}
                        />
                        <Text
                            style={[styles.sessionTitle, { color: theme.colors.black }]}
                            numberOfLines={1}
                        >
                            {session.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </DrawerContentScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: theme.colors.grey5 }]}>
                <TouchableOpacity
                    style={styles.footerItem}
                    onPress={() => props.navigation.navigate('Settings')}
                    activeOpacity={0.7}
                >
                    <Icon name="settings" type="feather" color={theme.colors.grey2} size={18} />
                    <Text style={[styles.footerText, { color: theme.colors.grey2 }]}>设置</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 12,
        paddingBottom: 16,
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        gap: 12,
    },
    newChatText: {
        fontSize: 14,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 12,
        paddingVertical: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sessionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginHorizontal: 8,
        borderRadius: 6,
        gap: 12,
    },
    sessionTitle: {
        flex: 1,
        fontSize: 14,
    },
    footer: {
        borderTopWidth: 1,
        padding: 12,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        gap: 12,
    },
    footerText: {
        fontSize: 14,
    },
});
