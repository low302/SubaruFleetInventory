# Quick Mobile Testing Guide

## How to Test on Your iOS Devices

### iPhone 17 Pro Max Testing

1. **Connect to Network**
   - Ensure iPhone is on same WiFi as your Mac
   - Find your Mac's IP: `System Settings > Network` or run `ifconfig | grep "inet "`

2. **Open in Safari**
   ```
   http://[YOUR-MAC-IP]:8080
   ```
   Example: `http://192.168.1.100:8080`

3. **Test Checklist**
   - [ ] Tap hamburger menu (☰) in top-left
   - [ ] Sidebar slides in from left
   - [ ] Tap overlay to close sidebar
   - [ ] Tap nav links - sidebar auto-closes
   - [ ] All buttons are easy to tap (44px minimum)
   - [ ] No content hidden by notch/Dynamic Island
   - [ ] Tables scroll smoothly
   - [ ] Forms don't zoom when focused
   - [ ] Test in portrait and landscape

### iPad Pro 11" Testing

1. **Open in Safari**
   - Same URL as iPhone: `http://[YOUR-MAC-IP]:8080`

2. **Test Checklist**
   - [ ] Hamburger menu appears (tablet mode)
   - [ ] Sidebar slides smoothly
   - [ ] Dashboard stats display well
   - [ ] Tables use full width
   - [ ] Charts render correctly
   - [ ] Test both orientations
   - [ ] Multi-finger gestures work
   - [ ] Split-view Safari works (optional)

## Testing from Mac

### Using Safari Developer Tools
1. Connect iPhone/iPad via cable
2. Enable Web Inspector on iOS: `Settings > Safari > Advanced > Web Inspector`
3. On Mac: `Safari > Develop > [Your Device] > localhost`
4. Can debug and inspect elements directly

### Using Chrome DevTools
1. Press `F12` or `Cmd+Option+I`
2. Click device icon (toggle device toolbar)
3. Select "iPad Pro 11" or "Responsive"
4. Set dimensions:
   - iPad Pro 11": `1668 x 2388`
   - iPhone 17 Pro Max: `1290 x 2796`
5. Toggle "Touch" mode

## Features to Test

### Core Mobile Features
- ✅ **Hamburger Menu** - Opens/closes sidebar
- ✅ **Touch Targets** - Easy to tap (44px minimum)
- ✅ **Sidebar Overlay** - Tap to dismiss
- ✅ **Smooth Animations** - No lag or jank
- ✅ **Responsive Tables** - Scroll horizontally
- ✅ **Forms** - No unwanted zoom
- ✅ **Safe Areas** - Content respects notch/home indicator

### Test Each Page
1. Dashboard - Stats cards stack vertically on mobile
2. Inventory - Table scrolls, all functions work
3. In-Transit - Same as inventory
4. PDI - Same as inventory
5. Pending Pickup - Same as inventory
6. Pickup Scheduled - Same as inventory
7. Sold Vehicles - Same as inventory
8. Trade-Ins - Modern table layout
9. Analytics - Charts render and scale

## Common Issues & Solutions

### "Can't Connect"
- Check your Mac's IP address
- Ensure both devices on same WiFi
- Check if Docker is running: `docker ps`
- Restart Docker if needed

### "Sidebar Not Appearing"
- Resize browser window below 1024px
- Refresh page with `Cmd+Shift+R`
- Clear Safari cache

### "Elements Too Small"
- This is fixed - all touch targets are 44px
- If still an issue, report specific element

### "Tables Too Wide"
- Tables should scroll horizontally on mobile
- This is expected behavior for data tables

## Viewport Sizes

### iPad Pro 11" (2nd Gen)
- Portrait: 834 x 1194 points (1668 x 2388 pixels @2x)
- Landscape: 1194 x 834 points (2388 x 1668 pixels @2x)
- Breakpoint: Shows mobile version at ≤1024px

### iPhone 17 Pro Max
- Portrait: 430 x 932 points (1290 x 2796 pixels @3x)
- Landscape: 932 x 430 points (2796 x 1290 pixels @3x)
- Breakpoint: Always shows mobile version

## Screenshot Testing

### Take Screenshots on iOS
1. Take screenshot: `Volume Up + Side Button`
2. Share with Mac via AirDrop
3. Document any issues with screenshots

### Chrome DevTools Screenshots
1. Open DevTools
2. Toggle device mode
3. `Cmd+Shift+P` > "Capture screenshot"
4. Choose "Capture full size screenshot"

## Performance Testing

### Check Smoothness
- Sidebar animation should be 60fps
- Scrolling should be smooth
- No lag when opening modals
- Quick response to taps

### Check Loading
- Initial load should be fast
- Charts render quickly
- Tables load smoothly
- No frozen screens

## Reporting Issues

If you find any issues, please note:
1. Device model (iPad Pro 11" or iPhone 17 Pro Max)
2. iOS version
3. Safari version
4. Screenshot if possible
5. Steps to reproduce
6. Expected vs actual behavior

## Quick Access

### Faster Testing
Add to home screen for web app experience:
1. Open in Safari
2. Tap Share button
3. "Add to Home Screen"
4. Now opens full-screen without Safari UI

This gives the most native-like experience!

---

**Application URL:** `http://localhost:8080` (or your Mac's IP)
**Default Login:** Username: `Zaid`, Password: `1234`
