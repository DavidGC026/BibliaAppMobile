import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const {
    registerWidgetConfigurationScreen,
    registerWidgetTaskHandler,
  } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { WidgetConfigurationScreen } = require('./widgets/WidgetConfigurationScreen') as typeof import('./widgets/WidgetConfigurationScreen');
  const { widgetTaskHandler } = require('./widgets/widget-task-handler') as typeof import('./widgets/widget-task-handler');

  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigurationScreen);
}
