import "@/global.css";
import { useSignIn } from "@clerk/expo";
import { Link } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { styled } from "nativewind";
import { useEffect, useRef, useState } from "react";
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

// ── OTP 6-box input ──────────────────────────────────────────────────────────
function OtpInput({
    code,
    onChange,
    disabled,
}: {
    code: string;
    onChange: (v: string) => void;
    disabled: boolean;
}) {
    const inputRef = useRef<TextInput>(null);
    const digits = code.padEnd(6, " ").split("").slice(0, 6);

    return (
        <Pressable onPress={() => inputRef.current?.focus()} className="flex-row gap-3 justify-center">
            <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                caretHidden
                editable={!disabled}
                className="absolute opacity-0"
                style={{ width: 1, height: 1 }}
            />
            {digits.map((d, i) => (
                <View
                    key={i}
                    className={`size-12 items-center justify-center rounded-2xl border ${code.length === i ? "border-accent bg-accent/10" : "border-border bg-background"
                        }`}
                >
                    <Text className="text-xl font-sans-bold text-primary">
                        {d.trim() || ""}
                    </Text>
                </View>
            ))}
        </Pressable>
    );
}

export default function SignIn() {
    const { signIn } = useSignIn();
    const posthog = usePostHog();

    // Step: 'signin' (email/password form) | 'verify' (OTP for device trust)
    const [step, setStep] = useState<"signin" | "verify">("signin");
    const [isLoading, setIsLoading] = useState(false);

    // Sign-in fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [globalError, setGlobalError] = useState("");

    // Verify fields
    const [code, setCode] = useState("");
    const [codeError, setCodeError] = useState("");

    // Resend countdown
    const [resendCountdown, setResendCountdown] = useState(0);

    useEffect(() => {
        if (resendCountdown <= 0) return;
        const timer = setTimeout(() => setResendCountdown((v) => v - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCountdown]);

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

    // ── Helper: send verification code and switch to verify step ──
    const sendVerificationCode = async () => {
        if (!signIn) return false;

        // Gửi mã xác thực qua email (MFA cho device trust)
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) {
            console.error("[SignIn] mfa.sendEmailCode error:", sendError);
            setGlobalError(sendError.message ?? "Failed to send verification code.");
            return false;
        }

        console.log("[SignIn] Verification code sent to email");
        setResendCountdown(60);
        setStep("verify");
        return true;
    };

    // ── Step 1: Sign in with email/password ──
    const handleSignIn = async () => {
        if (!signIn || !validate()) return;
        setIsLoading(true);
        setGlobalError("");

        try {
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
                return;
            }

            // Debug log để theo dõi cross-platform issues
            console.log("[SignIn] status:", signIn.status, "createdSessionId:", signIn.createdSessionId);

            if (signIn.status === "complete") {
                const { error: finalizeError } = await signIn.finalize();
                if (finalizeError) {
                    console.error("[SignIn] finalize error:", finalizeError);
                    setGlobalError(finalizeError.message ?? "Failed to activate session.");
                } else {
                    posthog.capture("User Signed In");
                }
                // Navigation guard trong _layout.tsx sẽ tự redirect khi isSignedIn thay đổi
            } else if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
                // Device Trust hoặc MFA — gửi mã xác thực qua email
                await sendVerificationCode();
            } else if (signIn.status === "needs_first_factor") {
                // Cần thêm bước xác thực đầu tiên
                setGlobalError("Additional first-factor verification is required. Please try again.");
            } else {
                console.warn("[SignIn] Unhandled status:", signIn.status);
                setGlobalError(
                    `Sign-in requires additional steps (${signIn.status}). Please contact support.`
                );
            }
        } catch (err: any) {
            console.error("[SignIn] unexpected error:", err);
            setGlobalError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 2: Verify OTP code (device trust / MFA) ──
    const handleVerify = async () => {
        if (!signIn) return;
        if (code.length < 6) {
            setCodeError("Please enter all 6 digits.");
            return;
        }
        setCodeError("");
        setIsLoading(true);

        try {
            const { error } = await signIn.mfa.verifyEmailCode({ code });

            if (error) {
                if (error.code === "form_code_incorrect") {
                    setCodeError("Incorrect code. Please check and try again.");
                } else if (error.code === "verification_expired") {
                    setCodeError("Code has expired. Please request a new one.");
                } else {
                    setCodeError(error.message ?? "Verification failed. Please try again.");
                }
                return;
            }

            console.log("[SignIn] After verify — status:", signIn.status, "createdSessionId:", signIn.createdSessionId);

            if (signIn.status === "complete") {
                const { error: finalizeError } = await signIn.finalize();
                if (finalizeError) {
                    console.error("[SignIn] finalize error:", finalizeError);
                    setCodeError(finalizeError.message ?? "Failed to activate session.");
                } else {
                    posthog.capture("User Signed In");
                }
                // Navigation guard trong _layout.tsx sẽ tự redirect
            } else {
                console.warn("[SignIn] Status after verify not complete:", signIn.status);
                setCodeError(
                    `Verification requires additional steps (${signIn.status}). Please try again.`
                );
            }
        } catch (err: any) {
            console.error("[SignIn] verify error:", err);
            setCodeError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Resend verification code ──
    const handleResend = async () => {
        if (!signIn || resendCountdown > 0) return;
        setIsLoading(true);

        const { error } = await signIn.mfa.sendEmailCode();
        if (error) {
            setCodeError("Failed to resend code. Please try again.");
        } else {
            setResendCountdown(60);
            setCode("");
            setCodeError("");
        }
        setIsLoading(false);
    };

    const isDisabled = isLoading || !signIn;

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: Verify step (Device Trust / MFA)
    // ─────────────────────────────────────────────────────────────────────────
    if (step === "verify") {
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
                            <Text className="auth-title">Verify your device</Text>
                            <Text className="auth-subtitle">
                                We sent a 6-digit code to{"\n"}
                                <Text className="font-sans-bold text-primary">{email}</Text>
                            </Text>
                        </View>

                        <View className="auth-card">
                            <View className="auth-form">

                                <OtpInput code={code} onChange={setCode} disabled={isDisabled} />

                                {!!codeError && (
                                    <Text className="auth-error text-center">{codeError}</Text>
                                )}

                                <Pressable
                                    className={`auth-button ${isDisabled || code.length < 6 ? "auth-button-disabled" : ""}`}
                                    onPress={handleVerify}
                                    disabled={isDisabled || code.length < 6}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#081126" size="small" />
                                    ) : (
                                        <Text className="auth-button-text">Verify</Text>
                                    )}
                                </Pressable>

                                <View className="auth-link-row">
                                    <Text className="auth-link-copy">Didn't receive it?</Text>
                                    <TouchableOpacity
                                        onPress={handleResend}
                                        disabled={isDisabled || resendCountdown > 0}
                                    >
                                        <Text
                                            className={`auth-link ${resendCountdown > 0 ? "opacity-40" : ""
                                                }`}
                                        >
                                            {resendCountdown > 0
                                                ? `Resend in ${resendCountdown}s`
                                                : "Resend code"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className="items-center mt-1"
                                    onPress={() => {
                                        setStep("signin");
                                        setCode("");
                                        setCodeError("");
                                    }}
                                    disabled={isDisabled}
                                >
                                    <Text className="auth-helper">← Back to sign in</Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: Sign-in step (email/password)
    // ─────────────────────────────────────────────────────────────────────────
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
