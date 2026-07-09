import { Pressable, Text, type StyleProp, type TextStyle } from 'react-native';

import { splitStrongCodes } from '@/lib/dictionary';

export function StrongLinkifiedText({
  text,
  style,
  codeStyle,
  onCodePress,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  codeStyle?: StyleProp<TextStyle>;
  onCodePress: (code: string) => void;
}) {
  const parts = splitStrongCodes(text);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <Text
            key={`${part.value}-${i}`}
            style={codeStyle}
            onPress={() => onCodePress(part.value)}
          >
            {part.value}
          </Text>
        ) : (
          <Text key={`t-${i}`}>{part.value}</Text>
        ),
      )}
    </Text>
  );
}
