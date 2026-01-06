'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { creatorSchema, type CreatorInput } from '@/lib/validators';

interface CreatorFormProps {
  onSubmit: (data: CreatorInput) => void;
  onCancel?: () => void;
}

export function CreatorForm({ onSubmit, onCancel }: CreatorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<CreatorInput>({
    resolver: zodResolver(creatorSchema),
    defaultValues: {
      name: '',
      socialLinks: [''],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'socialLinks' as never,
  });

  const handleFormSubmit = (data: CreatorInput) => {
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Creator Name
        </label>
        <Input {...register('name')} placeholder="John Doe" />
        {errors.name && (
          <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Social Media Links
        </label>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <Input
                {...register(`socialLinks.${index}`)}
                placeholder="https://instagram.com/username"
                className="flex-1"
              />
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="h-10 w-10 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {errors.socialLinks && (
          <p className="text-red-400 text-sm mt-1">
            {errors.socialLinks.message || 'Please enter valid URLs'}
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append('')}
          className="mt-2"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Link
        </Button>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit">Add Creator</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
