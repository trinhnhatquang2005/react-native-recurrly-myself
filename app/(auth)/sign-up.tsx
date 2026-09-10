import { useSignUp } from "@clerk/expo";
import { Link } from "expo-router";
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

// ── Sign-Up Screen ────────────────────────────────────────────────────────────
export default function SignUp() {
    const { signUp } = useSignUp();

    // Step: 'register' | 'verify'
    const [step, setStep] = useState<"register" | "verify">("register");
    const [isLoading, setIsLoading] = useState(false);

    // Register fields
    const [firstName, setFirstName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Register errors
    const [firstNameError, setFirstNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError] = useState("");
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

    // ── Validate register form ──
    const validateRegister = () => {
        let valid = true;
        setFirstNameError("");
        setEmailError("");
        setPasswordError("");
        setConfirmError("");
        setGlobalError("");

        if (!firstName.trim()) {
            setFirstNameError("First name is required.");
            valid = false;
        }
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
        } else if (password.length < 8) {
            setPasswordError("Password must be at least 8 characters.");
            valid = false;
        }
        if (!confirmPassword) {
            setConfirmError("Please confirm your password.");
            valid = false;
        } else if (password !== confirmPassword) {
            setConfirmError("Passwords do not match.");
            valid = false;
        }
        return valid;
    };

    // ── Step 1: Register ──
    const handleRegister = async () => {
        if (!signUp || !validateRegister()) return;
        setIsLoading(true);
        const { error } = await signUp.create({
            firstName: firstName.trim(),
            emailAddress: email.trim(),
            password,
        });

        if (error) {
            if (error.code === "form_identifier_exists") {
                setEmailError("An account with this email already exists.");
            } else if (error.code === "form_password_pwned" || error.code === "form_password_length_too_short") {
                setPasswordError(error.message);
            } else {
                setGlobalError(error.message ?? "Something went wrong. Please try again.");
            }
            setIsLoading(false);
            return;
        }

        const { error: prepareError } = await signUp.verifications.sendEmailCode();
        if (prepareError) {
            setGlobalError("Failed to send verification email.");
        } else {
            setResendCountdown(60);
            setStep("verify");
        }
        setIsLoading(false);
    };

    // ── Step 2: Verify OTP ──
    const handleVerify = async () => {
        if (!signUp) return;
        if (code.length < 6) {
            setCodeError("Please enter all 6 digits.");
            return;
        }
        setCodeError("");
        setIsLoading(true);

        try {
            const { error } = await signUp.verifications.verifyEmailCode({ code });

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

            // Debug log để theo dõi cross-platform issues
            console.log("[SignUp] status:", signUp.status, "createdSessionId:", signUp.createdSessionId);

            if (signUp.status === "complete") {
                const { error: finalizeError } = await signUp.finalize();
                if (finalizeError) {
                    console.error("[SignUp] finalize error:", finalizeError);
                    setCodeError(finalizeError.message ?? "Failed to activate session.");
                }
                // Navigation guard trong _layout.tsx sẽ tự redirect khi isSignedIn thay đổi
            } else {
                // Handle các status chưa complete
                console.warn("[SignUp] Unexpected status after verify:", signUp.status);
                setCodeError(
                    `Sign-up requires additional steps (${signUp.status}). Please try again or contact support.`
                );
            }
        } catch (err: any) {
            console.error("[SignUp] unexpected error:", err);
            setCodeError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Resend code ──
    const handleResend = async () => {
        if (!signUp || resendCountdown > 0) return;
        setIsLoading(true);
        const { error } = await signUp.verifications.sendEmailCode();
        if (error) {
            setCodeError("Failed to resend code. Please try again.");
        } else {
            setResendCountdown(60);
            setCode("");
            setCodeError("");
        }
        setIsLoading(false);
    };

    const isDisabled = isLoading || !signUp;

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: Verify step
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
                            <Text className="auth-title">Check your email</Text>
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
                                        <Text className="auth-button-text">Verify email</Text>
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
                                        setStep("register");
                                        setCode("");
                                        setCodeError("");
                                    }}
                                    disabled={isDisabled}
                                >
                                    <Text className="auth-helper">← Back to registration</Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: Register step
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
                        <Text className="auth-title">Create your account</Text>
                        <Text className="auth-subtitle">
                            Start tracking your subscriptions with Recurly
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

                            {/* First name */}
                            <View className="auth-field">
                                <Text className="auth-label">First name</Text>
                                <TextInput
                                    className={`auth-input ${firstNameError ? "auth-input-error" : ""}`}
                                    placeholder="Enter your first name"
                                    placeholderTextColor="rgba(0,0,0,0.35)"
                                    value={firstName}
                                    onChangeText={(v) => {
                                        setFirstName(v);
                                        if (firstNameError) setFirstNameError("");
                                    }}
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                    editable={!isDisabled}
                                />
                                {!!firstNameError && (
                                    <Text className="auth-error">{firstNameError}</Text>
                                )}
                            </View>

                            {/* Email */}
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

                            {/* Password */}
                            <View className="auth-field">
                                <Text className="auth-label">Password</Text>
                                <View className="relative">
                                    <TextInput
                                        className={`auth-input ${passwordError ? "auth-input-error" : ""}`}
                                        style={{ paddingRight: 72 }}
                                        placeholder="At least 8 characters"
                                        placeholderTextColor="rgba(0,0,0,0.35)"
                                        value={password}
                                        onChangeText={(v) => {
                                            setPassword(v);
                                            if (passwordError) setPasswordError("");
                                        }}
                                        secureTextEntry={!showPassword}
                                        textContentType="newPassword"
                                        returnKeyType="next"
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

                            {/* Confirm password */}
                            <View className="auth-field">
                                <Text className="auth-label">Confirm password</Text>
                                <View className="relative">
                                    <TextInput
                                        className={`auth-input ${confirmError ? "auth-input-error" : ""}`}
                                        style={{ paddingRight: 72 }}
                                        placeholder="Re-enter your password"
                                        placeholderTextColor="rgba(0,0,0,0.35)"
                                        value={confirmPassword}
                                        onChangeText={(v) => {
                                            setConfirmPassword(v);
                                            if (confirmError) setConfirmError("");
                                        }}
                                        secureTextEntry={!showConfirm}
                                        textContentType="newPassword"
                                        returnKeyType="done"
                                        onSubmitEditing={handleRegister}
                                        editable={!isDisabled}
                                    />
                                    <TouchableOpacity
                                        className="absolute right-4 top-0 bottom-0 justify-center"
                                        onPress={() => setShowConfirm((v) => !v)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Text className="text-sm font-sans-semibold text-muted-foreground">
                                            {showConfirm ? "Hide" : "Show"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {!!confirmError && (
                                    <Text className="auth-error">{confirmError}</Text>
                                )}
                            </View>

                            {/* Submit */}
                            <Pressable
                                className={`auth-button ${isDisabled ? "auth-button-disabled" : ""}`}
                                onPress={handleRegister}
                                disabled={isDisabled}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#081126" size="small" />
                                ) : (
                                    <Text className="auth-button-text">Create account</Text>
                                )}
                            </Pressable>

                            {/* Link to sign-in */}
                            <View className="auth-link-row">
                                <Text className="auth-link-copy">Already have an account?</Text>
                                <Link href="/(auth)/sign-in" asChild>
                                    <TouchableOpacity disabled={isDisabled}>
                                        <Text className="auth-link">Sign in</Text>
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
