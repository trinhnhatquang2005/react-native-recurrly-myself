import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const SignUp = () => {
    return (
        <View>
            <Text>SignUp</Text>
            <Link href="/(auth)/sign-in">Sign In</Link>
        </View>
    );
}

const styles = StyleSheet.create({})

export default SignUp;
