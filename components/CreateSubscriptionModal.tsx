import { icons } from '@/constants/icons';
import { posthog } from '@/lib/posthog';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

const CATEGORIES = ['Entertainment', 'AI Tools', 'Developer Tools', 'Design', 'Productivity', 'Cloud', 'Music', 'Other'];
const CATEGORY_COLORS: Record<string, string> = {
  'Entertainment': '#e8def8',
  'AI Tools': '#b8d4e3',
  'Developer Tools': '#e8def8',
  'Design': '#f5c542',
  'Productivity': '#b8e8d0',
  'Cloud': '#b8d4e3',
  'Music': '#e8def8',
  'Other': '#f5c542',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (sub: Subscription) => void;
}

export default function CreateSubscriptionModal({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [frequency, setFrequency] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [category, setCategory] = useState('Entertainment');

  const parsedPrice = parseFloat(price);
  const isValid = name.trim().length > 0 && !isNaN(parsedPrice) && parsedPrice > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    const startDate = dayjs().toISOString();
    const renewalDate = frequency === 'Monthly'
      ? dayjs().add(1, 'month').toISOString()
      : dayjs().add(1, 'year').toISOString();

    const newSub: Subscription = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      price: parsedPrice,
      billing: frequency,
      category,
      status: "active",
      startDate,
      renewalDate,
      icon: icons.wallet,
      currency: "USD",
      color: CATEGORY_COLORS[category] || '#b8d4e3'
    };

    onAdd(newSub);

    posthog?.capture('subscription_created', {
      subscription_name: name.trim(),
      subscription_price: parsedPrice,
      subscription_frequency: frequency,
      subscription_category: category,
    })

    // Reset form
    setName('');
    setPrice('');
    setFrequency('Monthly');
    setCategory('Entertainment');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable className="modal-overlay" onPress={onClose} />
        <View className="modal-container">
          <View className="modal-header">
            <Text className="modal-title">New Subscription</Text>
            <Pressable className="modal-close" onPress={onClose}>
              <Text className="modal-close-text">✕</Text>
            </Pressable>
          </View>

          <ScrollView className="modal-body" contentContainerClassName="gap-5 pb-10">
            {/* Form Fields */}
            <View className="auth-field">
              <Text className="auth-label">Name</Text>
              <TextInput
                className="auth-input"
                placeholder="Subscription name"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View className="auth-field">
              <Text className="auth-label">Price</Text>
              <TextInput
                className="auth-input"
                placeholder="0.00"
                placeholderTextColor="rgba(0,0,0,0.4)"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View className="auth-field">
              <Text className="auth-label">Frequency</Text>
              <View className="picker-row">
                <Pressable
                  className={clsx('picker-option', frequency === 'Monthly' && 'picker-option-active')}
                  onPress={() => setFrequency('Monthly')}
                >
                  <Text className={clsx('picker-option-text', frequency === 'Monthly' && 'picker-option-text-active')}>Monthly</Text>
                </Pressable>
                <Pressable
                  className={clsx('picker-option', frequency === 'Yearly' && 'picker-option-active')}
                  onPress={() => setFrequency('Yearly')}
                >
                  <Text className={clsx('picker-option-text', frequency === 'Yearly' && 'picker-option-text-active')}>Yearly</Text>
                </Pressable>
              </View>
            </View>

            <View className="auth-field">
              <Text className="auth-label">Category</Text>
              <View className="category-scroll">
                {CATEGORIES.map(cat => (
                  <Pressable
                    key={cat}
                    className={clsx('category-chip', category === cat && 'category-chip-active')}
                    onPress={() => setCategory(cat)}
                  >
                    <Text className={clsx('category-chip-text', category === cat && 'category-chip-text-active')}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              className={clsx('auth-button', !isValid && 'auth-button-disabled')}
              onPress={handleSubmit}
              disabled={!isValid}
            >
              <Text className="auth-button-text">Create Subscription</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
