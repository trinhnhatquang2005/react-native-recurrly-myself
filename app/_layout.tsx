import "@/global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";


SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
    throw new Error("Add your Clerk Publishable Key to the .env file");
}

// Navigation guard: redirect dựa trên auth state
function InitialLayout() {
    const { isLoaded, isSignedIn } = useAuth();
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
            <InitialLayout />
        </ClerkProvider>
    );
}
