# Keyboard Shortcuts Documentation

This document lists all available keyboard shortcuts in the application.

## Global Shortcuts

### Order Management

- **Ctrl + M**: Create new order
  - Available on: HomePage, OrderListPage
  - Opens the Order Edit Dialog in create mode
  - Works when not typing in input fields
  - Note: Changed from Ctrl+N to avoid conflict with Chrome's "New Tab" shortcut

## Implementation Details

The keyboard shortcuts are implemented using a custom React hook: `useKeyboardShortcut`

### Features:

- ✅ Modifier key support (Ctrl, Shift, Alt)
- ✅ Automatic input field detection (shortcuts disabled when typing)
- ✅ Cross-platform support (Ctrl on Windows/Linux, Cmd on Mac)
- ✅ Easy to extend for new shortcuts

### Usage Example:

```javascript
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

// In your component
useKeyboardShortcut("m", handleCreateOrder, { ctrl: true });
```

## Future Shortcuts (Planned)

Based on the UX improvement plan, these shortcuts could be added:

- **Ctrl + K**: Open command palette (global search)
- **Esc**: Close dialogs (already standard in most UI libraries)
- **Ctrl + P**: Print current order
- **Ctrl + S**: Save/Submit form
- **Ctrl + E**: Edit selected item
- **Delete**: Delete selected item (with confirmation)

## User Hints

Keyboard shortcuts are displayed as tooltips on relevant buttons. For example:

- Hover over "Tạo đơn hàng mới" button to see "Ctrl+M" hint with improved dark theme styling
