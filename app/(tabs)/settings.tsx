import { posthog } from "@/lib/posthog";
import { formatSubscriptionDateTime } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/expo";
import { styled } from "nativewind";
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const settings = () => {
    const { signOut } = useAuth();
    const { user } = useUser();

    const joinedDate = user?.createdAt
        ? formatSubscriptionDateTime(new Date(user.createdAt).toISOString())
        : 'Unknown';

    const handleSignOut = async () => {
        posthog?.capture("user_signed_out");
        await signOut();
        posthog?.reset();
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerClassName="flex-grow px-5 pt-4 pb-10">
                <Text className="text-3xl font-sans-bold text-foreground mb-8">Profile</Text>

                <View className="items-center mb-10">
                    <Image
                        source={{ uri: user?.imageUrl }}
                        className="w-28 h-28 rounded-full mb-4 bg-muted border-4 border-card"
                    />
                    <Text className="text-2xl font-sans-semibold text-foreground">
                        {user?.fullName || user?.firstName || 'User'}
                    </Text>
                    {user?.primaryEmailAddress?.emailAddress && (
                        <Text className="text-base font-sans text-muted-foreground mt-1">
                            {user?.primaryEmailAddress?.emailAddress}
                        </Text>
                    )}
                </View>

                <View className="bg-card rounded-3xl p-5 mb-8 border border-border">
                    <View className="flex-row justify-between py-3 border-b border-border/50">
                        <Text className="text-base font-sans-medium text-foreground">Account ID</Text>
                        <Text className="text-base font-sans text-muted-foreground">{user?.id?.slice(0, 12)}...</Text>
                    </View>

                    <View className="flex-row justify-between py-3">
                        <Text className="text-base font-sans-medium text-foreground">Joined</Text>
                        <Text className="text-base font-sans text-muted-foreground">{joinedDate}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleSignOut}
                    className="auth-button"
                >
                    <Text className="auth-button-text">Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    )
}

export default settings;