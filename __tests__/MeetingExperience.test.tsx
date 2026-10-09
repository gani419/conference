import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity, Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ControlBar } from '../src/components/meeting/ControlBar';
import { DateTimeField } from '../src/components/forms/DateTimeField';
import { feedback, type FeedbackMessage } from '../src/services/feedback';
let mockWidth = 390;
jest.mock('../src/hooks/useLayoutMode', () => ({ useLayoutMode: () => ({ width: mockWidth }) }));
jest.mock('../src/hooks/useResolvedTheme', () => ({ useResolvedTheme: () => ({ tokens: require('../shared/theme').LIGHT_TOKENS }) }));
jest.mock('../src/components/icons/AppIcon', () => ({ AppIcon: 'AppIcon' }));
const noop = jest.fn();
const props = {userRole:'host' as const,myPermissions:{microphone:true,camera:true,screenShare:true,chat:true},isMicOn:false,isCameraOn:false,isScreenSharing:false,isHandRaised:false,activePanelTab:'none',onToggleMic:noop,onRequestMicPermission:noop,onToggleCamera:noop,onRequestCameraPermission:noop,onToggleScreenShare:noop,onRequestScreenSharePermission:noop,onToggleChatPanel:noop,onToggleParticipantsPanel:noop,onToggleRaiseHand:noop,onLeavePress:jest.fn(),onEndMeetingPress:jest.fn()};
test('phone controls use icons, keep accessible labels and separate Leave from End for everyone',async()=>{
 mockWidth=390; let renderer!:TestRenderer.ReactTestRenderer;
 await act(async()=>{renderer=TestRenderer.create(<ControlBar {...props}/>);});
 expect(renderer.root.findAllByType(Text)).toHaveLength(0);
 const actions=renderer.root.findAllByType(TouchableOpacity);
 await act(async()=>{actions.find(action=>action.props.accessibilityLabel==='Leave meeting')!.props.onPress();});
 expect(props.onLeavePress).toHaveBeenCalledTimes(1);expect(props.onEndMeetingPress).not.toHaveBeenCalled();
 await act(async()=>{actions.find(action=>action.props.accessibilityLabel==='End for everyone')!.props.onPress();});
 expect(props.onEndMeetingPress).toHaveBeenCalledTimes(1);
 await act(async()=>renderer.unmount());
});
test('tablet controls show text with icons',async()=>{
 mockWidth=820;let renderer!:TestRenderer.ReactTestRenderer;
 await act(async()=>{renderer=TestRenderer.create(<ControlBar {...props}/>);});
 expect(renderer.root.findAllByType(Text).map(node=>node.props.children)).toContain('Leave meeting');
 await act(async()=>renderer.unmount());
});
test('date picker preserves the chosen time when scheduling next year',async()=>{
 const originalOS=Platform.OS;Object.defineProperty(Platform,'OS',{configurable:true,value:'android'});
 const onChange=jest.fn();let renderer!:TestRenderer.ReactTestRenderer;
 const value=new Date(2026,9,8,14,42);
 await act(async()=>{renderer=TestRenderer.create(<DateTimeField label="Start time" value={value} onChange={onChange}/>);});
 await act(async()=>{renderer.root.findAllByType(TouchableOpacity)[0]!.props.onPress();});
 const configuration=(DateTimePickerAndroid.open as jest.Mock).mock.calls.at(-1)[0];
 configuration.onValueChange({},new Date(2027,9,9));
 expect(onChange.mock.calls[0][0].getFullYear()).toBe(2027);expect(onChange.mock.calls[0][0].getHours()).toBe(14);expect(onChange.mock.calls[0][0].getMinutes()).toBe(42);
 await act(async()=>renderer.unmount());Object.defineProperty(Platform,'OS',{configurable:true,value:originalOS});
});
test('feedback sends informational toasts and defers destructive callbacks until confirmation',()=>{
 const messages:FeedbackMessage[]=[];const unsubscribe=feedback.subscribe(value=>messages.push(value));const onPress=jest.fn();
 feedback.alert('Saved','Meeting updated');feedback.alert('Logout','Are you sure?', [{text:'Stay',style:'cancel'},{text:'Logout',onPress}]);
 expect(messages[0]!.buttons).toBeUndefined();expect(messages[1]!.buttons).toHaveLength(2);expect(onPress).not.toHaveBeenCalled();unsubscribe();
});
