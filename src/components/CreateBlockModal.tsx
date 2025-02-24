import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { supabase } from '../../supabase';
import { Trash } from "lucide-react";
import { format } from 'date-fns';

interface CreateBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (block: any) => void;
  selectedDate: Date | undefined;
}

const colors = [
  { name: 'Red', value: '#FFB3B3' },
  { name: 'Green', value: '#B3FFB3' },
  { name: 'Blue', value: '#B3D9FF' },
  { name: 'Purple', value: '#E6B3FF' },
];

const CreateBlockModal: React.FC<CreateBlockModalProps> = ({ isOpen, onClose, onCreate, selectedDate }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors[0].value);
  const [libraryBlocks, setLibraryBlocks] = useState<any[]>([]);

  useEffect(() => {
    const fetchLibraryBlocks = async () => {
      const { data, error } = await supabase.from('library_blocks').select('*');
      if (error) {
        console.error('Error fetching library blocks:', error);
      } else {
        setLibraryBlocks(data || []);
      }
    };

    if (isOpen) {
      fetchLibraryBlocks();
    }
  }, [isOpen]);

  const handleCreateFromLibrary = async (libraryBlock: any) => {
    const { data: newBlockData, error: newBlockError } = await supabase
      .from('blocks')
      .insert([{ 
        title: libraryBlock.title, 
        color: libraryBlock.color, 
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        x: Math.floor(Math.random() * 200) - 100,
        y: Math.floor(Math.random() * 200) - 100
      }])
      .select('*');

    if (newBlockError) {
      console.error('Error creating block from library:', newBlockError);
      return;
    }

    const newBlockId = newBlockData[0].id;

    const { data: libraryTasks, error: libraryTasksError } = await supabase
      .from('library_tasks')
      .select('*')
      .eq('block_id', libraryBlock.id);

    if (libraryTasksError) {
      console.error('Error fetching library tasks:', libraryTasksError);
      return;
    }

    const tasksToInsert = libraryTasks.map(task => ({
      block_id: newBlockId,
      title: task.title,
      time: task.time,
      completed: task.completed,
    }));

    const { error: tasksInsertError } = await supabase
      .from('tasks')
      .insert(tasksToInsert);

    if (tasksInsertError) {
      console.error('Error inserting tasks from library:', tasksInsertError);
    }

    onCreate(newBlockData[0]);
    onClose();
  };

  const handleDeleteLibraryBlock = async (blockId: number) => {
    const { error } = await supabase
      .from('library_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      console.error('Error deleting library block:', error);
    } else {
      setLibraryBlocks((prevBlocks) => prevBlocks.filter((block) => block.id !== blockId));
    }
  };

  const handleCreateBlock = async () => {
    const newBlock = {
      title: name,
      color: colors.find(c => c.value === color)?.name || 'Unknown',
      x: Math.floor(Math.random() * 200) - 100,
      y: Math.floor(Math.random() * 200) - 100,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    };

    const { data, error } = await supabase.from('blocks').insert([newBlock]).select('*');

    if (error) {
      console.error('Error inserting block:', error);
    } else if (data && data.length > 0) {
      onCreate(data[0]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[350px] rounded-lg p-6 pt-12 bg-white">
        <div className="space-y-3">
          <Input placeholder="Block Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger className="w-full">
              <div className="flex items-center">
                <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                {colors.find(c => c.value === color)?.name}
              </div>
            </SelectTrigger>
            <SelectContent>
              {colors.map((colorOption) => (
                <SelectItem key={colorOption.value} value={colorOption.value}>
                  <div className="flex items-center">
                    <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: colorOption.value }}></span>
                    {colorOption.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <hr className="my-4" />
          <h3 className="text-lg font-bold">Library</h3>
          <ul className="mt-2 space-y-1">
            {libraryBlocks.map((block) => (
              <li 
                key={block.id} 
                className="flex items-center cursor-pointer p-2 rounded text-md" 
                style={{ transition: 'background-color 0.3s' }}
                onClick={() => handleCreateFromLibrary(block)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.find(c => c.name === block.color)?.value || '#FFFFFF'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Trash 
                  size={20}
                  className="text-red-500 hover:text-red-700 mr-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLibraryBlock(block.id);
                  }}
                />
                {block.title}
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="flex justify-end mt-4 space-x-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreateBlock}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBlockModal;
