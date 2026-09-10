import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { HOME_BALANCE, HOME_SUBSCRIPTIONS, UPCOMING_SUBSCRIPTIONS } from "@/constants/data";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import "@/global.css";
import { posthog } from "@/lib/posthog";
import { formatCurrency } from "@/lib/utils";
import { useUser } from '@clerk/expo';
import dayjs from "dayjs";
import { useSubscriptions } from "@/contexts/SubscriptionsContext";
import { styled } from "nativewind";
import { useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";


const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
    const { user } = useUser();
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
    const { subscriptions, addSubscription } = useSubscriptions();
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Get user display name: firstName, fullName, or email
    const displayName = user?.firstName || user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User';
    return (
        <SafeAreaView className="flex-1 p-5 bg-background">

            <FlatList
                ListHeaderComponent={() => (
                    <>
                        <View className="home-header">
                            <View className="home-user">
                                <Image source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
                                    className="home-avatar" />
                                <Text className="home-user-name">{displayName}</Text>
                            </View>
                            <Pressable onPress={() => setIsModalVisible(true)}>
                                <Image source={icons.add} className="home-add-icon" />
                            </Pressable>
                        </View>
                        <View className="home-balance-card">
                            <Text className="home-balance-label">Balance</Text>

                            <View className="home-balance-row">
                                <Text className="home-balance-amount">
                                    {formatCurrency(HOME_BALANCE.amount)}
                                </Text>
                                <Text className="home-balance-date">
                                    {dayjs(HOME_BALANCE.nextRenewalDate).format('MM/DD')}
                                </Text>
                            </View>
                        </View>
                        <View className="mb-5">
                            <ListHeading title="Upcoming" />
                            <FlatList
                                data={UPCOMING_SUBSCRIPTIONS}
                                renderItem={({ item }) => (<UpcomingSubscriptionCard {...item} />)}
                                keyExtractor={(item) => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                ListEmptyComponent={<Text className="home-empty-state">No upcoming renewals yet.</Text>}
                            />
                        </View>
                        <ListHeading title="All Subscriptions" />

                    </>
                )}
                data={subscriptions}
                renderItem={({ item }) => <SubscriptionCard
                    key={item.id}
                    {...item} // Trải toàn bộ field của item ra thành props riêng lẻ
                    expanded={expandedSubscriptionId === item.id} // So sánh: item này có phải cái đang mở không?
                    onPress={() => {
                        const isExpanded = expandedSubscriptionId !== item.id;
                        posthog?.capture("subscription_details_toggled", {
                            subscription_id: item.id,
                            is_expanded: isExpanded,
                        });
                        setExpandedSubscriptionId(isExpanded ? item.id : null);
                    }}
                />}
                keyExtractor={(item) => item.id}
                extraData={expandedSubscriptionId}
                ItemSeparatorComponent={() => <View className="h-4" />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text className="home-empty-state">No subscriptions yet.</Text>}
            />

            <CreateSubscriptionModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onAdd={addSubscription}
            />
        </SafeAreaView>
    );
}