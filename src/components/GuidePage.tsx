import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';

import { Bots } from '../config/Bots';
interface GuidePageProps {
    onSelect: (type: string) => void;
}

const GuidePage = ({ onSelect }: GuidePageProps) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Logo/Title Area */}
            <View style={styles.logoContainer}>
                <View style={[styles.logoCircle, { backgroundColor: theme.colors.grey4 }]}>
                    <Icon name="star" type="feather" color={theme.colors.primary} size={40} />
                </View>

                <Text style={[styles.subtitle, { color: theme.colors.grey2 }]}>
                    盘点生活美好，盘出精彩人生
                </Text>
            </View>

            {/* Option Cards */}
            <View style={styles.cardsContainer}>
                {Bots.map((bot) => (
                    <TouchableOpacity
                        key={bot.id}
                        style={[styles.card, { backgroundColor: theme.colors.grey1, borderColor: theme.colors.grey5 }]}
                        onPress={() => onSelect(bot.id)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.cardIcon, { backgroundColor: 'rgba(16, 163, 127, 0.15)' }]}>
                            <Icon name={bot.icon} type="feather" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={[styles.cardTitle, { color: theme.colors.black }]}>
                                {bot.name}
                            </Text>
                            <Text style={[styles.cardDescription, { color: theme.colors.grey2 }]}>
                                {bot.description}
                            </Text>
                        </View>
                        <Icon name="chevron-right" type="feather" size={20} color={theme.colors.grey2} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Bottom hint */}
            <Text style={[styles.hint, { color: theme.colors.grey2 }]}>
                选择一个话题开始对话
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 80, // Offset to push content up for better optical centering
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
    cardsContainer: {
        width: '100%',
        maxWidth: 400,
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
        marginLeft: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
    },
    hint: {
        marginTop: 48,
        fontSize: 14,
    },
});

export default GuidePage;
