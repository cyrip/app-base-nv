# End-to-End Encryption User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Generating Encryption Keys](#generating-encryption-keys)
4. [Enabling Encryption on Channels](#enabling-encryption-on-channels)
5. [Sending and Reading Encrypted Messages](#sending-and-reading-encrypted-messages)
6. [Verifying Fingerprints](#verifying-fingerprints)
7. [Backing Up Your Keys](#backing-up-your-keys)
8. [Frequently Asked Questions](#frequently-asked-questions)

---

## Introduction

End-to-end encryption (E2EE) ensures that only you and the people you're communicating with can read your messages. Not even the server can decrypt your messages.

### How It Works
- **Your Keys**: You generate a pair of encryption keys (public and private) on your device
- **Private Key**: Stays on your device, never sent to the server
- **Public Key**: Shared with others so they can send you encrypted messages
- **Encryption**: Messages are encrypted with AES-256-GCM and signed with RSA-4096

---

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Not in private/incognito mode (encryption keys need to be stored)

### Quick Start
1. Generate your encryption keys
2. Enable encryption on a channel
3. Start sending encrypted messages!

---

## Generating Encryption Keys

### Step 1: Open Key Management
1. Click the **🔐 Encryption Keys** button in the left sidebar
2. The Key Management modal will open

### Step 2: Generate Keys
1. Click **🔑 Generate Encryption Keys**
2. Wait ~1 second while your keys are generated (RSA-4096 is secure but takes a moment)
3. Your keys are automatically saved to your browser's secure storage

### Step 3: View Your Fingerprint
After generation, you'll see:
- **Key Type**: RSA-4096
- **Fingerprint**: A unique identifier for your public key (40 characters)
- **Created Date**: When your keys were generated

### Important Notes
- ⚠️ **Keys are stored locally** in your browser's IndexedDB
- ⚠️ **Clearing browser data will delete your keys**
- ⚠️ **Always export a backup** (see [Backing Up Your Keys](#backing-up-your-keys))

---

## Enabling Encryption on Channels

### Prerequisites
- All channel participants must have generated encryption keys
- You must be a member of the channel

### Steps to Enable Encryption

1. **Open the channel** you want to encrypt
2. **Check the status** - Look for the encryption indicator in the channel header:
   - 🔓 **Not Encrypted** - Encryption is not enabled
   - 🔒 **Encrypted** - Encryption is already enabled

3. **Click "Enable Encryption"** button (if not encrypted)

4. **Review the confirmation dialog**:
   - ⚠️ Once enabled, encryption **cannot be disabled**
   - All future messages will be encrypted
   - Previous messages remain unencrypted
   - All participants must have encryption keys

5. **Confirm** by clicking **"Enable Encryption"**

6. **Wait** while session keys are generated and distributed

7. **Success!** You'll see:
   - 🔒 **Encrypted** status in the channel header
   - A system message: "🔒 End-to-end encryption enabled by [your email]"
   - "Messages are encrypted" indicator below the message input

### What Happens Behind the Scenes
1. A unique session key (AES-256) is generated for the channel
2. The session key is encrypted with each participant's public key
3. Encrypted session keys are stored on the server
4. Each participant can decrypt the session key with their private key
5. Messages are encrypted/decrypted using the session key

---

## Sending and Reading Encrypted Messages

### Sending Encrypted Messages

Once encryption is enabled on a channel:

1. **Type your message** in the input field
2. **Press Enter** or click **Send**
3. Your message is automatically:
   - Encrypted with AES-256-GCM
   - Signed with your private key
   - Sent to the server (encrypted)

**Visual Indicators:**
- "Encrypting..." appears while encrypting
- 🔒 icon appears next to your sent message
- ✓ badge shows the message is signed

### Reading Encrypted Messages

Encrypted messages are automatically decrypted when you view them:

1. **Open an encrypted channel**
2. **Messages decrypt automatically** as they load
3. **Look for indicators**:
   - 🔒✓ **Green** - Encrypted & signature verified
   - 🔒 **Blue** - Encrypted
   - ⚠️ **Yellow** - Decryption error or signature failed
   - 🔓 **Gray** - Unencrypted message

### Error Messages

**"🔒 [Encrypted message - Generate keys to read]"**
- You don't have encryption keys yet
- Click the link to generate keys

**"🔒 [Encrypted message - Session key not available]"**
- You don't have access to the channel's session key
- This can happen if you joined after encryption was enabled

**"🔒 [Encrypted message - Cannot decrypt]"**
- Decryption failed for an unknown reason
- The message may be corrupted

**"⚠️ Warning: Message signature could not be verified"**
- The message signature is invalid
- The message may have been tampered with
- **Do not trust this message**

---

## Verifying Fingerprints

Fingerprint verification prevents man-in-the-middle attacks by ensuring you're communicating with the right person.

### What is a Fingerprint?
A fingerprint is a unique 40-character identifier for someone's public key. It looks like:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
```

### How to Verify Fingerprints

1. **View Encryption Info**
   - Click the 🔒 **Encrypted** status in the channel header
   - The Encryption Information modal opens

2. **Find Participant Fingerprints**
   - Scroll to "Participant Encryption Keys"
   - Each participant's fingerprint is displayed

3. **Verify Through a Secure Channel**
   - **In person**: Show each other your fingerprints
   - **Phone call**: Read your fingerprints to each other
   - **Video chat**: Show your fingerprints on screen
   - **DO NOT** verify via the same chat app (defeats the purpose!)

4. **Compare Fingerprints**
   - Both fingerprints must match exactly
   - Even one character difference means something is wrong

### When to Verify
- ✅ When first enabling encryption with someone
- ✅ After someone generates new keys
- ✅ If you suspect a security issue
- ✅ For sensitive conversations

### What If Fingerprints Don't Match?
- ⚠️ **Stop communicating immediately**
- Someone may be intercepting your messages
- Contact your IT security team
- Generate new keys and try again

---

## Backing Up Your Keys

### Why Backup?
- If you clear browser data, your keys are lost
- If you switch devices, you need your keys
- **Without your private key, you cannot decrypt old messages**

### How to Export Keys

1. **Open Key Management**
   - Click **🔐 Encryption Keys** button

2. **Click "💾 Export Keys (Backup)"**
   - A JSON file downloads automatically
   - Filename: `encryption-keys-backup-[userId]-[timestamp].json`

3. **Store Securely**
   - ⚠️ **This file contains your private key**
   - Store in a password manager
   - Store on an encrypted USB drive
   - Store in encrypted cloud storage
   - **DO NOT** email it to yourself
   - **DO NOT** store in plain text

### How to Import Keys

1. **Open Key Management**
   - Click **🔐 Encryption Keys** button

2. **Click "📁 Import Keys from Backup"**
   - Select your backup JSON file
   - Keys are restored to your browser

3. **Verify**
   - Check that your fingerprint matches your backup
   - Try decrypting old messages

### Best Practices
- ✅ Export keys immediately after generation
- ✅ Store backups in multiple secure locations
- ✅ Test your backup by importing on another device
- ✅ Update backups if you generate new keys
- ❌ Never share your backup file with anyone
- ❌ Never store backups unencrypted

---

## Frequently Asked Questions

### General Questions

**Q: Is end-to-end encryption enabled by default?**
A: No, you must manually enable it for each channel. This allows you to choose which conversations need encryption.

**Q: Can I disable encryption after enabling it?**
A: No, encryption cannot be disabled once enabled. This is a security feature to prevent accidental exposure of encrypted messages.

**Q: Can the server read my encrypted messages?**
A: No, the server only stores encrypted messages. Your private key never leaves your device, so only you can decrypt your messages.

**Q: What happens to messages sent before encryption was enabled?**
A: They remain unencrypted. Only messages sent after enabling encryption are encrypted.

### Key Management

**Q: What if I lose my private key?**
A: You cannot decrypt any messages encrypted with that key. This is why backing up your keys is critical.

**Q: Can I use the same keys on multiple devices?**
A: Yes, export your keys from one device and import them on another.

**Q: How often should I generate new keys?**
A: Only when necessary (e.g., if you suspect your key is compromised). Generating new keys means you can't decrypt old messages.

**Q: What if I accidentally delete my keys?**
A: Import them from your backup. If you don't have a backup, you'll need to generate new keys and won't be able to decrypt old messages.

### Encryption

**Q: What encryption algorithms are used?**
A: 
- **Message encryption**: AES-256-GCM
- **Key exchange**: RSA-4096 with RSA-OAEP
- **Signing**: RSASSA-PKCS1-v1_5 with SHA-256
- **Fingerprints**: SHA-256

**Q: Why does key generation take a second?**
A: RSA-4096 keys are very secure but require significant computation to generate. This is normal and only happens once.

**Q: Can I encrypt group channels?**
A: Yes, all participants must have encryption keys. The same session key is encrypted for each participant.

**Q: What if someone joins an encrypted channel?**
A: Currently, they won't be able to decrypt messages sent before they joined. Future updates may support adding new participants.

### Troubleshooting

**Q: I see "Web Crypto API not supported"**
A: Your browser doesn't support the required encryption APIs. Update to a modern browser (Chrome, Firefox, Safari, Edge).

**Q: I see "Private/Incognito mode detected"**
A: Encryption keys cannot be stored in private browsing mode. Use normal browsing mode.

**Q: Messages show "Cannot decrypt"**
A: 
- Ensure you have encryption keys generated
- Ensure you have access to the channel's session key
- Try refreshing the page
- Check if your keys were accidentally deleted

**Q: Signature verification fails**
A: 
- The message may have been tampered with
- The sender's public key may have changed
- There may be a network issue
- **Do not trust messages with failed signatures**

### Security

**Q: How secure is this encryption?**
A: Very secure. We use industry-standard algorithms (AES-256, RSA-4096) that are used by governments and militaries worldwide.

**Q: Can someone intercept my messages?**
A: They can intercept encrypted messages, but they cannot decrypt them without your private key.

**Q: What about metadata?**
A: The server knows who sent messages and when, but not the content. True metadata protection requires additional tools like Tor.

**Q: Should I verify fingerprints?**
A: Yes, especially for sensitive conversations. Fingerprint verification is the only way to be certain you're communicating with the right person.

---

## Need Help?

If you encounter issues or have questions not covered in this guide:

1. Check the error message for specific guidance
2. Try refreshing the page
3. Check that you're not in private/incognito mode
4. Ensure you have encryption keys generated
5. Contact your system administrator

---

## Security Best Practices

✅ **DO:**
- Generate encryption keys immediately
- Export and securely store key backups
- Verify fingerprints for sensitive conversations
- Use strong passwords for your account
- Keep your browser updated
- Log out when using shared computers

❌ **DON'T:**
- Share your private key or backup file
- Store backups unencrypted
- Use private/incognito mode for encrypted chats
- Clear browser data without backing up keys
- Trust messages with failed signature verification
- Verify fingerprints through the same chat app

---

*Last updated: December 2025*
