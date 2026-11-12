function Bone({ className }: { className: string }) {
  return (
    <span
      className={`block animate-pulse rounded-md bg-line motion-reduce:animate-none ${className}`}
    />
  );
}

export function CalendarSkeleton() {
  return (
    <div aria-hidden="true" className="grid h-full grid-cols-7 gap-2 p-3" data-skeleton="calendar">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Bone className="mx-auto h-3 w-8" />
          <Bone className="h-24 w-full" />
          <Bone className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function TodayPanelSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 p-4" data-skeleton="today">
      <Bone className="h-3 w-16" />
      <Bone className="h-10 w-full" />
      <Bone className="h-10 w-5/6" />
    </div>
  );
}

export function UpcomingWorkSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 p-4" data-skeleton="upcoming">
      <Bone className="h-3 w-24" />
      <Bone className="h-12 w-full" />
      <Bone className="h-12 w-full" />
    </div>
  );
}

export function TodoSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 p-4" data-skeleton="todo">
      <Bone className="h-3 w-14" />
      <Bone className="h-8 w-full" />
      <Bone className="h-8 w-4/5" />
      <Bone className="h-8 w-2/3" />
    </div>
  );
}

export function ReminderSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 p-4" data-skeleton="reminders">
      <Bone className="h-3 w-20" />
      <Bone className="h-10 w-full" />
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 p-4" data-skeleton="chat">
      <Bone className="h-12 w-4/5" />
      <Bone className="ml-auto h-12 w-2/3" />
      <Bone className="h-16 w-full" />
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-2 p-3" data-skeleton="search">
      <Bone className="h-10 w-full" />
      <Bone className="h-8 w-full" />
      <Bone className="h-8 w-5/6" />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4 p-6" data-skeleton="settings">
      <Bone className="h-6 w-32" />
      <Bone className="h-16 w-full" />
      <Bone className="h-16 w-full" />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3" data-skeleton="form">
      <Bone className="h-4 w-20" />
      <Bone className="h-11 w-full" />
      <Bone className="h-4 w-16" />
      <Bone className="h-11 w-full" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3" data-skeleton="profile">
      <Bone className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Bone className="h-4 w-28" />
        <Bone className="h-3 w-40" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="grid min-h-0 flex-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_22rem]"
      data-skeleton="dashboard"
    >
      <CalendarSkeleton />
      <div className="bg-surface">
        <TodayPanelSkeleton />
        <UpcomingWorkSkeleton />
        <TodoSkeleton />
        <ReminderSkeleton />
      </div>
    </div>
  );
}
