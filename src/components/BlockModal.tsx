import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/timepicker";
import { supabase } from '../../supabase'; // Import supabase
import "../styles/globals.css"
import { Trash, Save } from "lucide-react"; // Import the Trash and Save icons

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: any;
  onUpdateTasks: (tasks: any[]) => void;
}

const BlockModal: React.FC<BlockModalProps> = ({ isOpen, onClose, block, onUpdateTasks }) => {
  const [taskName, setTaskName] = useState('');
  const [time, setTime] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('block_id', block.id);

      if (error) {
        console.error('Error fetching tasks:', error);
      } else {
        setTasks(data || []);
      }
      setLoading(false);
    };

    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, block.id]);

  const handleCreateTask = async () => {
    if (!taskName.trim()) return; // Prevent empty tasks
  
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          block_id: block.id,
          title: taskName,
          time: time || null, // Allow time to be optional
          completed: false, // Default to not completed
        },
      ])
      .select('*'); // Ensure the inserted data is returned
  
    if (error) {
      console.error('Error creating task:', error);
    } else if (data && data.length > 0) {
      const newTasks = [...tasks, data[0]];
      setTasks(newTasks);
      onUpdateTasks(newTasks);
      setTaskName(''); // Clear input fields
      setTime('');
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskName(task.title);
    setTime(task.time || '');
  };

  const handleUpdateTask = async () => {
    if (editingTaskId === null) return;

    const { error } = await supabase
      .from('tasks')
      .update({ title: taskName, time: time || null })
      .eq('id', editingTaskId);

    if (error) {
      console.error('Error updating task:', error);
    } else {
      const updatedTasks = tasks.map((task) =>
        task.id === editingTaskId ? { ...task, title: taskName, time: time || null } : task
      );
      setTasks(updatedTasks);
      onUpdateTasks(updatedTasks);
      setEditingTaskId(null);
      setTaskName('');
      setTime('');
    }
  };

  const toggleCheck = async (taskId: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !currentStatus })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
    } else {
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !currentStatus } : task
      );
      setTasks(updatedTasks);
      onUpdateTasks(updatedTasks);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
    } else {
      const updatedTasks = tasks.filter((task) => task.id !== taskId);
      setTasks(updatedTasks);
      onUpdateTasks(updatedTasks);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
      return time; // Return as is if already formatted
    }
    const [hour, minute] = time.split(':');
    const hourInt = parseInt(hour, 10);
    const isPM = hourInt >= 12;
    const formattedHour = hourInt % 12 || 12;
    const ampm = isPM ? 'pm' : 'am';
    return `${formattedHour}:${minute}${ampm}`;
  };

  const handleSaveToLibrary = async () => {
    const { data: libraryBlockData, error: libraryBlockError } = await supabase
      .from('library_blocks')
      .insert([{ title: block.title, color: block.color }])
      .select('*');

    if (libraryBlockError) {
      console.error('Error saving block to library:', libraryBlockError);
      return;
    }

    const libraryBlockId = libraryBlockData[0].id;

    const tasksToInsert = tasks.map(task => ({
      block_id: libraryBlockId,
      title: task.title,
      time: task.time,
      completed: task.completed,
    }));

    const { error: libraryTasksError } = await supabase
      .from('library_tasks')
      .insert(tasksToInsert);

    if (libraryTasksError) {
      console.error('Error saving tasks to library:', libraryTasksError);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-8 bg-white">
        {/* Modal Header */}
        <div className="flex justify-center items-center mb-4">
          <h2 className="text-2xl font-bold mr-2">{block.title}</h2>
          <Save 
            onClick={handleSaveToLibrary} 
            className="cursor-pointer text-gray-600 hover:text-gray-800" 
            size={24} 
          />
        </div>

        <div className="flex">
          {/* Left Side: Task List */}
          <div className="flex-grow pr-6 border-r border-gray-300">
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="loader"></div> {/* Add your spinner class here */}
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center text-lg whitespace-nowrap overflow-hidden">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={task.completed}
                      onChange={() => toggleCheck(task.id, task.completed)}
                    />
                    <span
                      className={task.completed ? 'line-through' : ''}
                      onClick={() => handleEditTask(task)}
                    >
                      {task.title}
                      {task.time && (
                        <>
                          {' '}
                          <span className="text-green-500">@{formatTime(task.time)}</span>
                        </>
                      )}
                    </span>
                    <button
                      className="ml-2 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Side: Task Details */}
          <div className="flex-shrink-0 w-1/3 pl-6">
            <DialogHeader>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700">Task Name</label>
                <Input
                  placeholder="Enter task name"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700">Time</label>
                <TimePicker value={time} onChange={setTime} />
              </div>
            </div>
            <DialogFooter className="flex justify-end mt-6">
              {editingTaskId ? (
                <Button onClick={handleUpdateTask} className="text-lg">Update</Button>
              ) : (
                <Button onClick={handleCreateTask} className="text-lg">Create</Button>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockModal;
