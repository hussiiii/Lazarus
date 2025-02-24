import { useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Eye, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { format } from 'date-fns';
import "../styles/globals.css";
import { supabase } from '../../supabase'; 
import CreateBlockModal from '@/components/CreateBlockModal';
import BlockModal from '@/components/BlockModal';
import { Input } from "@/components/ui/input";

// Define the colors array
const colors = [
  { name: 'Red', value: '#FFB3B3' },
  { name: 'Green', value: '#B3FFB3' },
  { name: 'Blue', value: '#B3D9FF' },
  { name: 'Yellow', value: '#FFFFB3' },
  { name: 'Purple', value: '#E6B3FF' },
];

export default function Home() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [timeSensitiveTasks, setTimeSensitiveTasks] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [backlogTitle, setBacklogTitle] = useState('');
  const [backlogItems, setBacklogItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchBlocksAndTasks = async () => {
      if (!selectedDate) return;

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      console.log('Fetching blocks and tasks for date:', formattedDate);

      // Fetch blocks
      const { data: blockData, error: blockError } = await supabase
        .from('blocks')
        .select('*')
        .eq('date', formattedDate);

      if (blockError) {
        console.error('Error fetching blocks:', blockError);
      } else {
        setBlocks(blockData || []);
      }

      // Fetch time-sensitive tasks for the blocks of the selected date
      fetchTimeSensitiveTasks(blockData || []);
    };

    const fetchBacklogItems = async () => {
      const { data, error } = await supabase
        .from('backlog')
        .select('*');

      if (error) {
        console.error('Error fetching backlog items:', error);
      } else {
        setBacklogItems(data || []);
      }
    };

    fetchBlocksAndTasks();
    fetchBacklogItems();
  }, [selectedDate]);

  const fetchTimeSensitiveTasks = async (blocks: any[]) => {
    const blockIds = blocks.map(block => block.id);
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .in('block_id', blockIds)
      .not('time', 'is', null);

    if (taskError) {
      console.error('Error fetching tasks:', taskError);
    } else {
      // Sort tasks by time
      const sortedTasks = (taskData || []).sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return timeA[0] - timeB[0] || timeA[1] - timeB[1];
      });
      setTimeSensitiveTasks(sortedTasks);
    }
  };

  const updateTimeSensitiveTasks = () => {
    fetchTimeSensitiveTasks(blocks); // Refetch all time-sensitive tasks
  };

  const handleStop = async (e: any, data: any, blockId: any) => {
    const roundedX = Math.round(data.x);
    const roundedY = Math.round(data.y);

    console.log('Updating block position:', { x: roundedX, y: roundedY });

    // Update state immediately
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId ? { ...block, x: roundedX, y: roundedY } : block
      )
    );

    // Update database
    const { error } = await supabase
      .from('blocks')
      .update({ x: roundedX, y: roundedY })
      .eq('id', blockId);

    if (error) {
      console.error('Error updating block position:', error);
    }
  };

  const handleCreateBlock = (block: any) => {
    setBlocks((prevBlocks) => [...prevBlocks, block]);
  };

  const handleDeleteBlock = async (blockId: number) => {
    // Delete tasks associated with the block
    const { error: taskError } = await supabase
      .from('tasks')
      .delete()
      .eq('block_id', blockId);

    if (taskError) {
      console.error('Error deleting tasks:', taskError);
      return;
    }

    // Delete the block
    const { error: blockError } = await supabase
      .from('blocks')
      .delete()
      .eq('id', blockId);

    if (blockError) {
      console.error('Error deleting block:', blockError);
      return;
    }

    // Update UI
    setBlocks((prevBlocks) => prevBlocks.filter((block) => block.id !== blockId));
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

  const handleCreateBacklogItem = async () => {
    if (!backlogTitle.trim()) return;

    const { data, error } = await supabase
      .from('backlog')
      .insert([{ title: backlogTitle }])
      .select('*');

    if (error) {
      console.error('Error creating backlog item:', error);
    } else if (data && data.length > 0) {
      console.log('Backlog item created:', data);
      setBacklogItems((prevItems) => [...prevItems, data[0]]);
      setBacklogTitle('');
    }
  };

  const handleDeleteBacklogItem = async (itemId: number) => {
    const { error } = await supabase
      .from('backlog')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting backlog item:', error);
    } else {
      setBacklogItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Date Picker */}
      <div className="absolute top-4 left-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
          </PopoverContent>
        </Popover>

        {/* Transparent Square with Header */}
        <div className="mt-4 w-[280px] border bg-transparent p-4 rounded-md">
          <h3 className="text-lg font-bold">Logs</h3>
          <ul className="mt-2 space-y-1">
            {timeSensitiveTasks.map((task) => {
              const blockColor = blocks.find(block => block.id === task.block_id)?.color;
              const colorValue = colors.find(color => color.name === blockColor)?.value || '#000';
              return (
                <li
                  key={task.id}
                  className={`text-sm ${task.completed ? 'line-through' : ''}`}
                >
                  <span className="inline-block w-2 h-2 mr-2 rounded-full" style={{ backgroundColor: colorValue }}></span>
                  {task.title} <span className="text-green-500">@{formatTime(task.time)}</span>
                </li>
              );
            })}
          </ul>
        </div>
        </div>

      {/* Backlog Box */}
      <div className="absolute top-4 right-4 w-[280px] border bg-transparent p-4 rounded-md">
        <h3 className="text-lg font-bold">Backlog</h3>
        <ul className="mt-2 space-y-1">
          {backlogItems.map((item) => (
            <li key={item.id} className="text-sm flex items-center">
              <button
                className="text-red-500 hover:text-red-700 mr-2"
                onClick={() => handleDeleteBacklogItem(item.id)}
              >
                <Trash className="h-4 w-4" />
              </button>
              {item.title}
            </li>
          ))}
        </ul>
        <div className="flex mt-4">
          <Input
            placeholder="Enter backlog item"
            value={backlogTitle}
            onChange={(e) => setBacklogTitle(e.target.value)}
            className="flex-grow mr-2"
          />
          <Button onClick={handleCreateBacklogItem} className="text-sm text-white">Create</Button>
        </div>
      </div>

      {/* Draggable Blocks */}
      <div className="flex items-center justify-center min-h-screen">
        {blocks.map((block) => (
          <Draggable
            key={block.id}
            position={{ x: block.x, y: block.y }}
            onStop={(e, data) => {
              handleStop(e, data, block.id).catch(console.error);
            }}
          >
            <Card
              className="w-40 h-40 flex flex-col items-center justify-center shadow-lg rounded-lg relative"
              style={{ backgroundColor: colors.find(c => c.name === block.color)?.value || '#FFFFFF' }}
            >
              <button
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                onClick={() => handleDeleteBlock(block.id)}
              >
                <Trash className="h-5 w-5" />
              </button>
              <span className="text-white font-bold">{block.title}</span>
              <button
                className="mt-2 text-sm text-gray-600 hover:text-gray-200"
                onClick={() => setSelectedBlock(block)} // Open BlockModal
              >
                <Eye className="h-5 w-5" />
              </button>
            </Card>
          </Draggable>
        ))}
      </div>

      {/* Create New Block Button */}
      <div className="absolute bottom-4 right-4">
        <Button className="bg-black text-white shadow-lg rounded-lg" onClick={() => setIsModalOpen(true)}>
          Create New Block +
        </Button>
      </div>

      {/* Create Block Modal */}
      <CreateBlockModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateBlock} selectedDate={selectedDate} />

      {/* Block Modal */}
      {selectedBlock && (
        <BlockModal
          isOpen={!!selectedBlock}
          onClose={() => setSelectedBlock(null)}
          block={selectedBlock}
          onUpdateTasks={updateTimeSensitiveTasks}
        />
      )}
    </div>
  );
}
