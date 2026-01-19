import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, ListItem, Icon, Avatar, Divider, useTheme } from '@rneui/themed';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { observer } from 'mobx-react-lite';
import { chatStore } from '../store/ChatStore';
import { userStore } from '../store/UserStore';

export const CustomDrawerContent = observer((props: any) => {
    const { theme } = useTheme();

    const handleNewSession = () => {
        chatStore.startNewSession(); // Defaults to 'unselected'
        props.navigation.closeDrawer();
    };

    const handleSelectSession = (id: string) => {
        chatStore.loadSession(id);
        props.navigation.closeDrawer();
    };

    const handleDeleteSession = (id: string) => {
        Alert.alert('Delete', 'Delete this session?', [
            { text: 'Cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => chatStore.deleteSession(id) }
        ]);
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <Button
                    title="New Session"
                    icon={{ name: 'plus', type: 'feather', color: 'white' }}
                    buttonStyle={{ borderRadius: 20, marginHorizontal: 20 }}
                    onPress={handleNewSession}
                />
            </View>

            <DrawerContentScrollView {...props}>
                <Text style={styles.sectionTitle}>History</Text>
                {chatStore.sessions.map((s) => (
                    <ListItem
                        key={s.id}
                        onPress={() => handleSelectSession(s.id)}
                        onLongPress={() => handleDeleteSession(s.id)}
                        containerStyle={{ backgroundColor: chatStore.currentSessionId === s.id ? theme.colors.grey0 : 'transparent' }}
                    >
                        <Icon
                            name={s.type === 'happy' ? 'smile' : 'book'}
                            type="feather"
                            color={s.type === 'happy' ? theme.colors.success : theme.colors.primary}
                            size={16}
                        />
                        <ListItem.Content>
                            <ListItem.Title style={{ fontSize: 14 }}>{s.title}</ListItem.Title>
                            <ListItem.Subtitle style={{ fontSize: 10 }}>{new Date(s.timestamp).toLocaleDateString()}</ListItem.Subtitle>
                        </ListItem.Content>
                    </ListItem>
                ))}
            </DrawerContentScrollView>

            <View style={styles.footer}>
                <Button
                    type="clear"
                    icon={{ name: 'settings', color: theme.colors.grey2 }}
                    title="Settings"
                    titleStyle={{ color: theme.colors.grey2 }}
                    onPress={() => props.navigation.navigate('Settings')}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    header: {
        paddingTop: 50,
        paddingBottom: 20,
    },
    sectionTitle: {
        marginLeft: 20,
        marginBottom: 10,
        fontSize: 12,
        color: '#888',
        fontWeight: 'bold'
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    }
});
