# Boxing Coach WebXR: Phase 1

This is the WebXR foundation only. It includes 6DoF headset tracking, two low-poly controller-mounted boxing gloves, trigger haptics, and a desktop scene preview. It does **not** include the gym, bag, punch detection, coach, or workout loop yet.

## Run locally

1. Install dependencies with `npm install`.
2. Start the development server with `npm run dev -- --host 0.0.0.0`.
3. Open the printed `http://localhost:5173` URL on your computer for the desktop preview. A desktop without a VR headset will show "VR NOT SUPPORTED"; that is expected.

## Test on Meta Quest 3

WebXR immersive mode needs a secure origin. A plain `http://<your-computer-LAN-IP>:5173` page on the headset is **not** sufficient. Build with `npm run build`, then publish the generated `dist/` directory to an HTTPS static host (for example, Netlify Drop or Vercel). Open its HTTPS URL in Meta Quest Browser.

1. Wear the headset and hold both Quest controllers.
2. Open the HTTPS page in Meta Quest Browser and select **ENTER VR**.
3. Move your head to verify positional and rotational tracking. Move each controller to verify its glove follows your hand.
4. Squeeze each index trigger. The glove briefly lights up and, where supported by the browser and controllers, gives a short haptic pulse.
5. Leave VR using the browser's exit control or the page's **EXIT VR** button.

Use a clear play area. Haptic actuator availability varies by browser version; visual trigger feedback still works if haptics are unavailable.