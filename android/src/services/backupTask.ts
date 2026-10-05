import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { getDriveSettings, runDailyBackup } from './driveBackup';

const TASK = 'anbu-daily-drive-backup';
if (Platform.OS === 'android' && !TaskManager.isTaskDefined(TASK)) {
  TaskManager.defineTask(TASK, async () => {
    try { await runDailyBackup(); return BackgroundTask.BackgroundTaskResult.Success; }
    catch { return BackgroundTask.BackgroundTaskResult.Failed; }
  });
}

export async function updateBackupSchedule() {
  if (Platform.OS !== 'android' || !await TaskManager.isAvailableAsync()) return false;
  const { enabled } = await getDriveSettings();
  if (enabled) {
    if (await BackgroundTask.getStatusAsync() === BackgroundTask.BackgroundTaskStatus.Restricted) return false;
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 60 });
  } else if (await TaskManager.isTaskRegisteredAsync(TASK)) {
    await BackgroundTask.unregisterTaskAsync(TASK);
  }
  return true;
}
