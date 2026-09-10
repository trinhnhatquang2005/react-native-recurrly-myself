import SubscriptionCard from "@/components/SubscriptionCard";
import { useSubscriptions } from "@/contexts/SubscriptionsContext";
import { styled } from "nativewind";
import React, { useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const subscriptions = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
    const { subscriptions: allSubscriptions } = useSubscriptions();

    const filteredSubscriptions = allSubscriptions.filter(sub => 
        sub.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView className="flex-1 p-5 bg-background">
            <View className="mb-5">
                <Text className="text-3xl font-sans-bold text-primary mb-4">Subscriptions</Text>
                <TextInput
                    className="auth-input"
                    placeholder="Search subscriptions..."
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            
            <FlatList
                data={filteredSubscriptions}
                renderItem={({ item }) => <SubscriptionCard
                    {...item}
                    expanded={expandedSubscriptionId === item.id}
                    onPress={() => {
                        setExpandedSubscriptionId(prev => prev === item.id ? null : item.id);
                    }}
                />}
                keyExtractor={(item) => item.id}
                extraData={expandedSubscriptionId}
                ItemSeparatorComponent={() => <View className="h-4" />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text className="home-empty-state">No subscriptions found.</Text>}
            />
        </SafeAreaView>
    )
}

export default subscriptions;