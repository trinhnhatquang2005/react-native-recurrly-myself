import "@/global.css";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

function BrandBlock() {
    return (
        <View className="auth-brand-block">
            <View className="auth-logo-wrap">
                <View className="auth-logo-mark">
                    <Text className="auth-logo-mark-text">R</Text>
                </View>
                <View>
                    <Text className="auth-wordmark">Recurly</Text>
                    <Text className="auth-wordmark-sub">Smart Billing</Text>
                </View>
            </View>
        </View>
    );
}

export default function SignIn() {
    const { signIn } = useSignIn();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [globalError, setGlobalError] = useState("");

    const validate = () => {
        let valid = true;
        setEmailError("");
        setPasswordError("");
        setGlobalError("");
        if (!email.trim()) {
            setEmailError("Email is required.");
            valid = false;
        } else if (!isValidEmail(email)) {
            setEmailError("Please enter a valid email address.");
            valid = false;
        }
        if (!password) {
            setPasswordError("Password is required.");
            valid = false;
        } else if (password.length < 6) {
            setPasswordError("Password must be at least 6 characters.");
            valid = false;
        }
        return valid;
    };

    const handleSignIn = async () => {
        if (!signIn || !validate()) return;
        setIsLoading(true);
        const { error } = await signIn.create({
            identifier: email.trim(),
            password,
        });
        if (error) {
            if (error.code === "form_identifier_not_found") {
                setEmailError("No account found with this email.");
            } else if (error.code === "form_password_incorrect") {
                setPasswordError("Incorrect password. Please try again.");
            } else {
                setGlobalError(error.message ?? "Something went wrong. Please try again.");
            }
        } else if (signIn.status === "complete") {
            await signIn.finalize();
            router.replace("/(tabs)");
        }
        setIsLoading(false);
    };

    const isDisabled = isLoading || !signIn;

    return (
        <SafeAreaView className="auth-safe-area">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    className="auth-scroll"
                    contentContainerClassName="auth-content"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <BrandBlock />

                    <View className="mt-8 items-center">
                        <Text className="auth-title">Welcome back</Text>
                        <Text className="auth-subtitle">
                            Sign in to continue managing your subscriptions
                        </Text>
                    </View>

                    <View className="auth-card">
                        <View className="auth-form">

                            {!!globalError && (
                                <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                                    <Text className="text-sm font-sans-medium text-destructive">
                                        {globalError}
                                    </Text>
                                </View>
                            )}

                            <View className="auth-field">
                                <Text className="auth-label">Email</Text>
                                <TextInput
                                    className={`auth-input ${emailError ? "auth-input-error" : ""}`}
                                    placeholder="Enter your email"
                                    placeholderTextColor="rgba(0,0,0,0.35)"
                                    value={email}
                                    onChangeText={(v) => {
                                        setEmail(v);
                                        if (emailError) setEmailError("");
                                        if (globalError) setGlobalError("");
                                    }}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    textContentType="emailAddress"
                                    returnKeyType="next"
                                    editable={!isDisabled}
                                />
                                {!!emailError && (
                                    <Text className="auth-error">{emailError}</Text>
                                )}
                            </View>

                            <View className="auth-field">
                                <Text className="auth-label">Password</Text>
                                <View className="relative">
                                    <TextInput
                                        className={`auth-input ${passwordError ? "auth-input-error" : ""}`}
                                        style={{ paddingRight: 72 }}
                                        placeholder="Enter your password"
                                        placeholderTextColor="rgba(0,0,0,0.35)"
                                        value={password}
                                        onChangeText={(v) => {
                                            setPassword(v);
                                            if (passwordError) setPasswordError("");
                                            if (globalError) setGlobalError("");
                                        }}
                                        secureTextEntry={!showPassword}
                                        textContentType="password"
                                        returnKeyType="done"
                                        onSubmitEditing={handleSignIn}
                                        editable={!isDisabled}
                                    />
                                    <TouchableOpacity
                                        className="absolute right-4 top-0 bottom-0 justify-center"
                                        onPress={() => setShowPassword((v) => !v)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Text className="text-sm font-sans-semibold text-muted-foreground">
                                            {showPassword ? "Hide" : "Show"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {!!passwordError && (
                                    <Text className="auth-error">{passwordError}</Text>
                                )}
                            </View>

                            <Pressable
                                className={`auth-button ${isDisabled ? "auth-button-disabled" : ""}`}
                                onPress={handleSignIn}
                                disabled={isDisabled}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#081126" size="small" />
                                ) : (
                                    <Text className="auth-button-text">Sign in</Text>
                                )}
                            </Pressable>

                            <View className="auth-link-row">
                                <Text className="auth-link-copy">New to Recurly?</Text>
                                <Link href="/(auth)/sign-up" asChild>
                                    <TouchableOpacity disabled={isDisabled}>
                                        <Text className="auth-link">Create an account</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>

                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
