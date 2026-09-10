import "@/global.css";
import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, usePathname, useRouter, useSegments } from "expo-router";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { type ReactNode, useEffect, useRef } from "react";

import { posthog } from "@/lib/posthog";


SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
    throw new Error("Add your Clerk Publishable Key to the .env file");
}

function ErrorFallback() {
    return null;
}

function AnalyticsProvider({ children }: { children: ReactNode }) {
    if (!posthog) {
        return children;
    }

    return (
        <PostHogProvider client={posthog} autocapture={{ captureScreens: false }}>
            <PostHogErrorBoundary fallback={ErrorFallback}>
                {children}
            </PostHogErrorBoundary>
        </PostHogProvider>
    );
}

// Navigation guard: redirect dựa trên auth state
function InitialLayout() {
    const { isLoaded, isSignedIn } = useAuth();
    const { isLoaded: isUserLoaded, user } = useUser();
    const identifiedUserId = useRef<string | null>(null);
    const previousPathname = useRef<string | null>(null);
    const pathname = usePathname();
    const segments = useSegments();
    const router = useRouter();

    const [fontsLoaded] = useFonts({
        "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
        "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
        "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
        "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
        "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
        "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);


    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            identifiedUserId.current = null;
            return;
        }

        // Clerk's immutable user ID is the stable PostHog distinct ID. Email and
        // name are person properties rather than event properties.
        if (!posthog || !isUserLoaded || !user || identifiedUserId.current === user.id) return;

        const email = user.primaryEmailAddress?.emailAddress;
        const name = user.fullName;
        posthog.identify(user.id, email || name
            ? {
                $set: {
                    ...(email ? { email } : {}),
                    ...(name ? { name } : {}),
                },
            }
            : undefined);
        identifiedUserId.current = user.id;
    }, [isLoaded, isSignedIn, isUserLoaded, user]);

    useEffect(() => {
        if (!pathname || previousPathname.current === pathname) return;

        posthog?.screen(pathname, {
            previous_screen: previousPathname.current,
        });
        previousPathname.current = pathname;
    }, [pathname]);

    useEffect(() => {
        if (!fontsLoaded || !isLoaded) return;

        const inAuthGroup = segments[0] === "(auth)";

        if (isSignedIn && inAuthGroup) {
            // Đã đăng nhập mà đang ở auth → chuyển vào app
            router.replace("/(tabs)");
        } else if (!isSignedIn && !inAuthGroup) {
            // Chưa đăng nhập mà đang ở bên trong app → chuyển về sign-in
            router.replace("/(auth)/sign-in");
        }
    }, [isLoaded, isSignedIn, segments, fontsLoaded]);

    if (!fontsLoaded || !isLoaded) {
        console.log('Returning null. fontsLoaded:', fontsLoaded, 'isLoaded:', isLoaded);
        return null;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
    return (
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <AnalyticsProvider>
                <InitialLayout />
            </AnalyticsProvider>
        </ClerkProvider>
    );
}
