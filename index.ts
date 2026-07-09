import 'expo-router/entry';
import {
  registerWidgetConfigurationScreen,
  registerWidgetTaskHandler,
} from 'react-native-android-widget';

import { WidgetConfigurationScreen } from './widgets/WidgetConfigurationScreen';
import { widgetTaskHandler } from './widgets/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(WidgetConfigurationScreen);
