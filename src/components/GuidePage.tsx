import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';

interface GuidePageProps {
    onSelect: (type: 'happy' | 'daily') => void;
}

const GuidePage = ({ onSelect }: GuidePageProps) => {
    const { theme } = useTheme();
    return (
        <View style={styles.guideContainer}>
            <Text h3 style={{ marginBottom: 30, color: theme.colors.black }}>想聊点什么？</Text>

            <TouchableOpacity
                style={[styles.guideCard, { backgroundColor: '#E8F5E9' }]}
                onPress={() => onSelect('happy')}
            >
                <Icon name="smile" type="feather" size={40} color="#43A047" />
                <View style={styles.guideTextContainer}>
                    <Text h4 style={{ color: '#2E7D32' }}>高兴的事情</Text>
                    <Text style={{ color: '#4CAF50', marginTop: 5 }}>分享今天的快乐时刻</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.guideCard, { backgroundColor: '#E3F2FD' }]}
                onPress={() => onSelect('daily')}
            >
                <Icon name="book" type="feather" size={40} color="#1E88E5" />
                <View style={styles.guideTextContainer}>
                    <Text h4 style={{ color: '#1565C0' }}>日常记录</Text>
                    <Text style={{ color: '#42A5F5', marginTop: 5 }}>记录生活的点滴</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    guideContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    guideCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    guideTextContainer: {
        marginLeft: 20,
    }
});

export default GuidePage;
