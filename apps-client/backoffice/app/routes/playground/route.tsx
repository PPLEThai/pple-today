import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Button } from '@pple-today/web-ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@pple-today/web-ui/card'
import { ComboBox } from '@pple-today/web-ui/combobox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@pple-today/web-ui/command'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@pple-today/web-ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@pple-today/web-ui/popover'
import { Typography } from '@pple-today/web-ui/typography'
import { Calculator, Calendar, CreditCard, Settings, Smile, User } from 'lucide-react'
import z from 'zod'

const ColorPaletteSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-sans">Color Palette</h2>
      <div className="space-y-2">
        <div className="space-y-2">
          <p className="font-sans">Primary</p>
          <div className="flex">
            <div className="w-8 h-8 bg-primary-50" />
            <div className="w-8 h-8 bg-primary-100" />
            <div className="w-8 h-8 bg-primary-200" />
            <div className="w-8 h-8 bg-primary-300" />
            <div className="w-8 h-8 bg-primary-400" />
            <div className="w-8 h-8 bg-primary-500" />
            <div className="w-8 h-8 bg-primary-600" />
            <div className="w-8 h-8 bg-primary-700" />
            <div className="w-8 h-8 bg-primary-800" />
            <div className="w-8 h-8 bg-primary-900" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-sans">Secondary</p>
          <div className="flex">
            <div className="w-8 h-8 bg-secondary-50" />
            <div className="w-8 h-8 bg-secondary-100" />
            <div className="w-8 h-8 bg-secondary-200" />
            <div className="w-8 h-8 bg-secondary-300" />
            <div className="w-8 h-8 bg-secondary-400" />
            <div className="w-8 h-8 bg-secondary-500" />
            <div className="w-8 h-8 bg-secondary-600" />
            <div className="w-8 h-8 bg-secondary-700" />
            <div className="w-8 h-8 bg-secondary-800" />
            <div className="w-8 h-8 bg-secondary-900" />
          </div>
        </div>
      </div>
    </section>
  )
}

const TypographySection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-sans">Typography</h2>
      <div className="flex gap-4">
        <div className="space-y-2">
          <Typography variant="h1">h1 - Heading 1 (Typography Component)</Typography>
          <Typography variant="h2">h2 - Heading 2 (Typography Component)</Typography>
          <Typography variant="h3">h3 - Heading 3 (Typography Component)</Typography>
          <Typography variant="h4">h4 - Heading 4 (Typography Component)</Typography>
          <Typography variant="h5">h5 - Heading 5 (Typography Component)</Typography>
          <Typography variant="h6">h6 - Heading 6 (Typography Component)</Typography>
          <Typography variant="large">Large - Large Text (Typography Component)</Typography>
          <Typography variant="p">Base - Base Text (Typography Component)</Typography>
          <Typography variant="small">Small - Small Text (Typography Component)</Typography>
          <Typography variant="blockquote" component="blockquote">
            Blockquote - Blockquote Text (Typography Component)
          </Typography>
          <Typography variant="code" component="code">
            Code - Code Text (Typography Component)
          </Typography>
          <Typography variant="lead">Lead - Lead Text (Typography Component)</Typography>
          <Typography variant="muted">Muted - Muted Text (Typography Component)</Typography>
        </div>
      </div>
    </section>
  )
}

const ButtonSection = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-sans">Button</h2>
      <div className="flex gap-2">
        <Button>Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon">Icon</Button>
      </div>
    </div>
  )
}

const CardSection = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-sans">Card</h2>
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl font-sans">Card Title</CardTitle>
        </CardHeader>
        <CardDescription className="text-base font-sans text-secondary-foreground">
          This is a simple card component. You can use it to display content in a structured way.
        </CardDescription>
        <CardContent className="space-y-4">
          <p className="text-base font-sans">
            Cards are versatile components that can be used for various purposes, such as displaying
            user profiles, product information, or any other content that benefits from a clean
            layout.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <p className="text-base font-sans">
            Cards are versatile components that can be used for various purposes, such as displaying
            user profiles, product information, or any other content that benefits from a clean
            layout.
          </p>
        </CardFooter>
        <CardAction className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </CardAction>
      </Card>
    </div>
  )
}

const ComboBoxSection = () => {
  const [selectedOption, setSelectedOption] = useState<string>('')

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-sans">ComboBox</h2>
      <ComboBox
        inputPlaceholder="Search options..."
        placeholder="Select an option"
        options={[
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
          { label: 'Option 3', value: 'option3' },
        ]}
        value={selectedOption}
        onChange={(value) => setSelectedOption(value)}
      />
      <p className="font-sans">Current Value: {selectedOption}</p>
      <ComboBox
        placeholder="Select an option"
        options={[
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
          { label: 'Option 3', value: 'option3' },
        ]}
        disabled
      />
    </div>
  )
}

const CommandSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-sans">Command</h2>
      <Command className="rounded-lg border shadow-md md:min-w-[450px]">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <Calendar />
              <span>Calendar</span>
            </CommandItem>
            <CommandItem>
              <Smile />
              <span>Search Emoji</span>
            </CommandItem>
            <CommandItem disabled>
              <Calculator />
              <span>Calculator</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              <User />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <CreditCard />
              <span>Billing</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Settings />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </section>
  )
}

const DialogSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-sans">Dialog</h2>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle asChild>
            <h2 className="text-2xl font-sans">Dialog Title</h2>
          </DialogTitle>
          <p className="text-base font-sans text-secondary-foreground">
            This is a dialog content area. You can place any content here, such as forms, text, or
            other components.
          </p>
          <div className="flex justify-end">
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DialogTrigger>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

const TestFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
})

type TestFormSchemaOutput = z.infer<typeof TestFormSchema>

const FormSection = () => {
  const form = useForm<TestFormSchemaOutput>({
    resolver: standardSchemaResolver(TestFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  })

  const onSubmit: SubmitHandler<TestFormSchemaOutput> = (data: z.infer<typeof TestFormSchema>) => {
    console.log('Form submitted:', data)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Form {...form}>
        <h2 className="text-2xl font-sans">Test Form</h2>
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ชื่อจริง</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ชื่อจริง" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>นามสกุล</FormLabel>
              <FormControl>
                <Input {...field} placeholder="นามสกุล" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </Form>
    </form>
  )
}

const InputSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-sans">Input</h2>
      <Input placeholder="Default Input" />
      <Input placeholder="Disabled Input" disabled />
      <Input placeholder="Error Input" aria-invalid="true" />
    </section>
  )
}

const PopoverSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-sans">Popover</h2>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <p className="font-sans text-center">Testing Popover</p>
        </PopoverContent>
      </Popover>
    </section>
  )
}

const PlaygroundPage = () => {
  return (
    <div className="p-5 space-y-6">
      <h1 className="text-3xl font-sans text-primary">Playground</h1>
      <hr className="border border-secondary-100" />
      <ColorPaletteSection />
      <hr className="border border-secondary-100" />
      <TypographySection />
      <hr className="border border-secondary-100" />
      <ButtonSection />
      <hr className="border border-secondary-100" />
      <CardSection />
      <hr className="border border-secondary-100" />
      <ComboBoxSection />
      <hr className="border border-secondary-100" />
      <CommandSection />
      <hr className="border border-secondary-100" />
      <DialogSection />
      <hr className="border border-secondary-100" />
      <FormSection />
      <hr className="border border-secondary-100" />
      <InputSection />
      <hr className="border border-secondary-100" />
      <PopoverSection />
    </div>
  )
}

export default PlaygroundPage
