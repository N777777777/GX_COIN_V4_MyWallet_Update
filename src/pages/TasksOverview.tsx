import { TaskManager } from "@/components/TaskManager";
import { MyCreatedTasks } from "@/components/MyCreatedTasks";

const TasksOverview = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Task Management
            </h1>
            <p className="text-muted-foreground">
              Track your task progress and review status
            </p>
          </div>
          
          {/* My Created Tasks */}
          <div className="mb-6">
            <MyCreatedTasks />
          </div>
          
          <TaskManager />
        </div>
      </div>
    </div>
  );
};

export default TasksOverview;