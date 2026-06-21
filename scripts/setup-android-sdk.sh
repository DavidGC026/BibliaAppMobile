#!/usr/bin/env bash
# Configura Android SDK en el servidor (Debian/Ubuntu).
# Uso: sudo bash scripts/setup-android-sdk.sh

set -euo pipefail

SDK_ROOT="${ANDROID_HOME:-/opt/android-sdk}"

echo "==> Instalando Java (OpenJDK)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq default-jdk-headless wget unzip

echo "==> Descargando Android command-line tools..."
mkdir -p "$SDK_ROOT/cmdline-tools"
TMP=$(mktemp -d)
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O "$TMP/cmdtools.zip"
unzip -qo "$TMP/cmdtools.zip" -d "$SDK_ROOT/cmdline-tools"
rm -rf "$SDK_ROOT/cmdline-tools/latest"
mv "$SDK_ROOT/cmdline-tools/cmdline-tools" "$SDK_ROOT/cmdline-tools/latest"
rm -rf "$TMP"

export ANDROID_HOME="$SDK_ROOT"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

echo "==> Aceptando licencias..."
yes | sdkmanager --sdk_root="$SDK_ROOT" --licenses >/dev/null

echo "==> Instalando platform-tools, Android 35, build-tools..."
sdkmanager --sdk_root="$SDK_ROOT" \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0"

PROFILE=/etc/profile.d/android-sdk.sh
cat > "$PROFILE" <<EOF
export ANDROID_HOME=$SDK_ROOT
export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools
EOF
chmod 644 "$PROFILE"

echo ""
echo "Android SDK instalado en: $SDK_ROOT"
"$SDK_ROOT/platform-tools/adb" version
echo ""
echo "Recarga la shell: source $PROFILE"
echo "Luego en mobile/: npm run android"
