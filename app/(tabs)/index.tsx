import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { HOME_BALANCE, HOME_SUBSCRIPTIONS, UPCOMING_SUBSCRIPTIONS } from "@/constants/data";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import "@/global.css";
import { formatCurrency } from "@/lib/utils";
import { useUser } from '@clerk/expo';
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useState } from "react";
import { FlatList, Image, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";


const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
    const { user } = useUser();
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
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
                            <Image source={icons.add} className="home-add-icon" />
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
                data={HOME_SUBSCRIPTIONS}
                renderItem={({ item }) => <SubscriptionCard
                    key={item.id}
                    {...item} // Trải toàn bộ field của item ra thành props riêng lẻ
                    expanded={expandedSubscriptionId === item.id} // So sánh: item này có phải cái đang mở không?
                    onPress={() =>
                        setExpandedSubscriptionId((currentId) =>
                            // Nếu id hiện tại đang mở trùng với item này -> đóng lại (null)
                            // Ngược lại -> mở item này ra (item.id)
                            currentId === item.id ? null : item.id
                        )
                    }
                />}
                keyExtractor={(item) => item.id}
                extraData={expandedSubscriptionId}
                ItemSeparatorComponent={() => <View className="h-4" />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text className="home-empty-state">No subscriptions yet.</Text>}
            />

        </SafeAreaView>
    );
}