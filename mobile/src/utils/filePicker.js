import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';

/**
 * Ensures the given file name has a valid extension.
 * If missing, deduces extension from the MIME type.
 */
export function ensureFileExtension(name = '', mimeType = '') {
  let fileName = String(name || '').trim();
  const mime = String(mimeType || '').toLowerCase();
  
  // Extract existing extension if present
  let ext = '';
  if (fileName.includes('.')) {
    const parts = fileName.split('.');
    const candidate = parts.pop().toLowerCase();
    if (candidate && candidate.length <= 5) {
      ext = candidate;
    }
  }

  if (!ext) {
    if (mime.includes('pdf')) ext = 'pdf';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('word') || mime.includes('docx') || mime.includes('wordprocessingml')) ext = 'docx';
    else if (mime.includes('doc') || mime.includes('msword')) ext = 'doc';
    else if (mime.includes('sheet') || mime.includes('excel') || mime.includes('xlsx') || mime.includes('spreadsheetml')) ext = 'xlsx';
    else if (mime.includes('xls')) ext = 'xls';
    else if (mime.includes('csv')) ext = 'csv';
    else if (mime.includes('plain') || mime.includes('text')) ext = 'txt';
    else if (mime.includes('zip')) ext = 'zip';
    else ext = 'pdf'; // standard safe fallback for office documents

    fileName = fileName ? `${fileName}.${ext}` : `doc_${Date.now()}.${ext}`;
  }

  return fileName;
}

/**
 * Directly picks a document from device storage (Downloads, Drive, Files)
 */
export async function pickSingleDocument(allowedTypes = [types.allFiles]) {
  try {
    const selected = await pick({
      type: allowedTypes,
      allowMultiSelection: false,
    });

    if (selected && selected.length > 0) {
      const file = selected[0];
      const validName = ensureFileExtension(file.name, file.type);
      return {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: validName,
        size: file.size || 0,
      };
    }
    return null;
  } catch (err) {
    if (!isErrorWithCode(err) || err.code !== errorCodes.OPERATION_CANCELED) {
      console.warn('Pick single document error:', err);
    }
    return null;
  }
}

/**
 * Directly picks a single photo from Photo Gallery / Library
 */
export async function pickSinglePhoto() {
  try {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: false,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const validName = ensureFileExtension(asset.fileName || `photo_${Date.now()}.jpg`, asset.type || 'image/jpeg');
    return {
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      name: validName,
      size: asset.fileSize || 0,
    };
  } catch (err) {
    console.warn('launchImageLibrary error:', err);
    return null;
  }
}

/**
 * Directly captures a photo with device camera
 */
export async function takePhotoWithCamera() {
  try {
    const result = await launchCamera({
      mediaType: 'photo',
      saveToPhotos: true,
      includeBase64: false,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const validName = ensureFileExtension(asset.fileName || `camera_${Date.now()}.jpg`, asset.type || 'image/jpeg');
    return {
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      name: validName,
      size: asset.fileSize || 0,
    };
  } catch (err) {
    console.warn('launchCamera error:', err);
    return null;
  }
}

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
          name: ensureFileExtension(asset.fileName || `photo_${Date.now()}_${idx + 1}.jpg`, asset.type),
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
          name: ensureFileExtension(asset.fileName || `camera_${Date.now()}.jpg`, asset.type || 'image/jpeg'),
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
          type: [types.allFiles],
          allowMultiSelection: allowMultiSelection,
        });

        if (selected && selected.length > 0) {
          const normalized = selected.map((file) => ({
            uri: file.uri,
            type: file.type || 'application/octet-stream',
            name: ensureFileExtension(file.name || `file_${Date.now()}`, file.type),
            size: file.size || 0,
          }));
          resolve(normalized);
        } else {
          resolve(null);
        }
      } catch (err) {
        if (!isErrorWithCode(err) || err.code !== errorCodes.OPERATION_CANCELED) {
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
