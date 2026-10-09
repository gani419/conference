import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { VerifyContactScreen } from '../src/features/auth/VerifyContactScreen';
import { AppButton } from '../src/components/forms/AppButton';
import { AppInput } from '../src/components/forms/AppInput';
import { authService } from '../src/services/authService';
const mockDispatch = jest.fn();
jest.mock('../src/store/hooks', () => ({ useAppDispatch: () => mockDispatch }));
jest.mock('../src/hooks/useResolvedTheme', () => ({
  useResolvedTheme: () => ({ tokens: require('../shared/theme').LIGHT_TOKENS }),
}));
jest.mock('../src/components/icons/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/authService', () => ({
  authService: { verifyContact: jest.fn(), resendVerificationCode: jest.fn() },
}));
const mockVerify = authService.verifyContact as jest.Mock;
const mockResend = authService.resendVerificationCode as jest.Mock;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());
async function mount() {
  const navigation = { replace: jest.fn() };
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <VerifyContactScreen
        navigation={navigation as any}
        route={
          {
            params: {
              verificationId: 'test@example.com',
              contactDestination: 'test@example.com',
              pendingMeetingCode: 'ABC123',
            },
          } as any
        }
      />,
    );
  });
  const press = async (title: string) => {
    await act(async () => {
      await renderer.root
        .findAllByType(AppButton)
        .find(button => button.props.title === title)!
        .props.onPress();
    });
  };
  return { renderer, navigation, press };
}
test('starts empty, verifies a real code and continues the pending invitation', async () => {
  const { renderer, navigation, press } = await mount();
  expect(renderer.root.findByType(AppInput).props.value).toBe('');
  await press('Verify email');
  expect(mockVerify).not.toHaveBeenCalled();
  await act(async () =>
    renderer.root.findByType(AppInput).props.onChangeText('12345678'),
  );
  const session = { kind: 'registered', user: { id: 'user-1' } };
  mockVerify.mockResolvedValue({ success: true, data: { session } });
  await press('Verify email');
  expect(mockVerify).toHaveBeenCalledWith({
    verificationId: 'test@example.com',
    code: '12345678',
  });
  expect(mockDispatch).toHaveBeenCalled();
  expect(navigation.replace).toHaveBeenCalledWith('JoinLink', {
    code: 'ABC123',
  });
  await act(async () => renderer.unmount());
});
test('failed resend remains retryable; successful resend starts cooldown and clears code', async () => {
  const { renderer, press } = await mount();
  await act(async () =>
    renderer.root.findByType(AppInput).props.onChangeText('12345678'),
  );
  mockResend
    .mockResolvedValueOnce({
      success: false,
      error: { message: 'Email rate limit exceeded' },
    })
    .mockResolvedValueOnce({ success: true, data: true });
  await press('Resend code');
  expect(renderer.root.findByType(AppInput).props.error).toBe(
    'Email rate limit exceeded',
  );
  expect(
    renderer.root
      .findAllByType(AppButton)
      .find(button => button.props.title === 'Resend code')!.props.disabled,
  ).toBe(false);
  await press('Resend code');
  expect(renderer.root.findByType(AppInput).props.value).toBe('');
  expect(
    renderer.root
      .findAllByType(AppButton)
      .find(button => button.props.title === 'Resend code in 60s')!.props
      .disabled,
  ).toBe(true);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(
    renderer.root
      .findAllByType(AppButton)
      .find(button => button.props.title === 'Resend code')!.props.disabled,
  ).toBe(false);
  await act(async () => renderer.unmount());
});
