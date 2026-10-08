import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick } from '@react-native-documents/picker';

/**
 * Universal file & photo picker for iOS & Android
 * Supports:
 * - Photo Library (PHPicker / UIImagePickerController)
 * - Camera capture
 * - Document Picker (Files app / iCloud Drive / Downloads)
 * 
 * Returns normalized array of files:
 * [{ uri, type, name, size }]
 */
export async function pickFilesOrPhotos({
  allowMultiSelection = true,
  includeCamera = true,
  mediaType = 'mixed',
} = {}) {
  return new Promise((resolve) => {
    const handlePhotos = async () => {
      try {
        const result = await launchImageLibrary({
          mediaType: mediaType === 'photo' ? 'photo' : 'mixed',
          selectionLimit: allowMultiSelection ? 0 : 1,
          includeBase64: false,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) {
          resolve(null);
          return;
        }

        const normalized = result.assets.map((asset, idx) => ({
          uri: asset.uri,
          type: asset.type || (asset.uri?.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'),
          name: asset.fileName || `photo_${Date.now()}_${idx + 1}.jpg`,
          size: asset.fileSize || 0,
        }));

        resolve(normalized);
      } catch (err) {
        console.warn('launchImageLibrary error:', err);
        resolve(null);
      }
    };

    const handleCamera = async () => {
      try {
        const result = await launchCamera({
          mediaType: 'photo',
          saveToPhotos: true,
          includeBase64: false,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) {
          resolve(null);
          return;
        }

        const normalized = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `camera_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
        }));

        resolve(normalized);
      } catch (err) {
        console.warn('launchCamera error:', err);
        resolve(null);
      }
    };

    const handleDocuments = async () => {
      try {
        const selected = await pick({
          type: ['*/*'],
          allowMultiSelection: allowMultiSelection,
        });

        if (selected && selected.length > 0) {
          const normalized = selected.map((file) => ({
            uri: file.uri,
            type: file.type || 'application/octet-stream',
            name: file.name || `file_${Date.now()}`,
            size: file.size || 0,
          }));
          resolve(normalized);
        } else {
          resolve(null);
        }
      } catch (err) {
        if (err.code !== 'DOCUMENT_PICKER_CANCELED') {
          console.warn('Document picker error:', err);
        }
        resolve(null);
      }
    };

    if (Platform.OS === 'ios') {
      const options = includeCamera
        ? ['Cancel', '🖼️ Choose from Photo Library', '📷 Take Photo', '📁 Browse Documents / Files']
        : ['Cancel', '🖼️ Choose from Photo Library', '📁 Browse Documents / Files'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: 'Select Attachment Source',
        },
        (buttonIndex) => {
          if (includeCamera) {
            if (buttonIndex === 1) handlePhotos();
            else if (buttonIndex === 2) handleCamera();
            else if (buttonIndex === 3) handleDocuments();
            else resolve(null);
          } else {
            if (buttonIndex === 1) handlePhotos();
            else if (buttonIndex === 2) handleDocuments();
            else resolve(null);
          }
        }
      );
    } else {
      // Android alert options
      const buttons = [
        {
          text: '🖼️ Photos / Gallery',
          onPress: handlePhotos,
        },
        {
          text: '📁 Documents / Files',
          onPress: handleDocuments,
        },
      ];

      if (includeCamera) {
        buttons.unshift({
          text: '📷 Take Photo',
          onPress: handleCamera,
        });
      }

      buttons.push({
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve(null),
      });

      Alert.alert('Upload Attachment', 'Choose where you would like to select files from:', buttons);
    }
  });
}
