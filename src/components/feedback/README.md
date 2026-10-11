# Shared Feedback / Notification System

The shared notification layer is available through `useNotifications()`.

```tsx
const notifications = useNotifications();

notifications.success("Saved", "Changes were saved.");
notifications.error("Save failed", "Please try again.");
notifications.warning("Session expiring", "You will be signed out soon.");
notifications.info("Import started");

notifications.alert({
  title: "Service notice",
  message: "A persistent inline alert.",
  variant: "warning",
});

const confirmed = await notifications.confirm({
  title: "Delete record?",
  message: "This action cannot be undone.",
  variant: "danger",
  confirmLabel: "Delete",
});
```

All components are tenant-aware, dark-mode compatible, keyboard accessible, and mounted once at the application root.
