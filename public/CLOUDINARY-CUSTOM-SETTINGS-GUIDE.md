# Cloudinary Custom Settings Setup Guide

## 🎯 Your Specified Settings

You want to use these exact settings for your Cloudinary uploads:

```
overwrite: false
use_filename: false
unique_filename: false
use_filename_as_display_name: true
use_asset_folder_as_public_id_prefix: false
type: upload
asset_folder: portfolio
```

## 🔧 Step-by-Step Setup

### Option 1: Create Preset in Cloudinary Dashboard (RECOMMENDED)

1. **Go to Cloudinary Console:**
   - Visit: https://cloudinary.com/console
   - Login to your account

2. **Navigate to Upload Settings:**
   - Click "Settings" (gear icon)
   - Click "Upload" tab
   - Scroll to "Upload presets" section

3. **Create New Preset:**
   - Click "Add upload preset"
   - Enter these **EXACT** settings:

   **Basic Settings:**
   - **Preset name:** `ml_default`
   - **Signing mode:** **Unsigned** ← CRITICAL!
   - **Folder:** `portfolio`

   **Advanced Settings:**
   - **Overwrite:** `false`
   - **Use filename:** `false`
   - **Unique filename:** `false`
   - **Use filename as display name:** `true`
   - **Use asset folder as public ID prefix:** `false`
   - **Resource type:** `image`
   - **Delivery type:** `upload`

4. **Save the Preset**

### Option 2: Use the Automated Script

I've created a script that automatically applies your settings. It's already loaded in your case study editor.

## 🧪 Testing Your Settings

### Test Page
Open `test-custom-settings-upload.html` to test:

1. **Select an image file**
2. **Click "Test Upload (Custom Settings)"**
3. **Check the results**

### Expected Behavior

With your settings:
- **overwrite: false** - Won't replace existing files
- **use_filename: false** - Won't use original filename
- **unique_filename: false** - Won't add random suffix
- **use_filename_as_display_name: true** - Original filename becomes display name
- **use_asset_folder_as_public_id_prefix: false** - Asset folder not in public ID
- **asset_folder: portfolio** - Files organized in portfolio folder

## 🔍 Troubleshooting

### Error: "Upload preset must be whitelisted"
**Solution:** The preset isn't created or isn't set to "Unsigned"
1. Go to Cloudinary dashboard
2. Create/edit the `ml_default` preset
3. Set signing mode to **"Unsigned"**

### Error: "Invalid signature"
**Solution:** Using signed upload with wrong parameters
- The script automatically handles this
- Falls back to signed upload if unsigned fails

### Files not appearing in correct folder
**Solution:** Check folder settings
- Preset folder: `portfolio`
- Upload folder: `portfolio/subfolder` (optional)

## 🎯 Implementation Status

✅ **Custom settings script created:** `js/cloudinary-upload-with-settings.js`
✅ **Added to case study editor:** `case_study_editor_complete.html`
✅ **Test page created:** `test-custom-settings-upload.html`
✅ **Automatic fallback:** Tries unsigned first, then signed
✅ **Preset creation:** Can create preset automatically

## 🚀 Next Steps

1. **Test the upload:** Open `test-custom-settings-upload.html`
2. **Create the preset:** Click "Create Preset with Settings" if needed
3. **Verify in dashboard:** Check your Cloudinary console
4. **Use in production:** Your case study editor now uses these settings

## 📋 Code Integration

The custom settings are automatically applied to:
- `window.cloudinaryService.uploadSingleFile()`
- `window.uploadSingleImage()`
- All upload functions in the case study editor

## 🔐 Security Notes

- **Unsigned uploads:** Faster but less secure
- **Signed uploads:** More secure, used as fallback
- **API secret:** Only used server-side for signatures
- **Preset validation:** Cloudinary validates all uploads

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify preset exists in Cloudinary dashboard
3. Test with the provided test page
4. Ensure signing mode is "Unsigned"

Your custom settings are now ready to use! 🎉