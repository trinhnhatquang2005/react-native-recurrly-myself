import { styled } from "nativewind";
import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const settings = () => {
    return (
        <SafeAreaView className="flex-1 p-5 bg-background">
            <Text>settings</Text>
        </SafeAreaView>
    )
}

export default settings