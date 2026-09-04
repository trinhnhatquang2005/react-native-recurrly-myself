import '@/global.css'
import { Link, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { Text, View } from 'react-native'


const SubscriptionDetail = () => {
    const { id } = useLocalSearchParams<{ id: string }>()
    return (
        <View className="flex-1 items-center justify-center bg-background">
            <Text>SubscriptionDetail: {id}</Text>
            <Link href="/" style={{ color: "red" }}>Go back</Link>
        </View>
    )
}

export default SubscriptionDetail