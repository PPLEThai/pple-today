import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Avatar, AvatarFallback, AvatarImage } from '@pple-today/web-ui/avatar'
import { Badge } from '@pple-today/web-ui/badge'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@pple-today/web-ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { Label } from '@pple-today/web-ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@pple-today/web-ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@pple-today/web-ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@pple-today/web-ui/sheet'
import { Switch } from '@pple-today/web-ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@pple-today/web-ui/tooltip'
import { Typography } from '@pple-today/web-ui/typography'
import {
  BadgeCheckIcon,
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
} from 'lucide-react'
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

const BadgeSection = () => {
  return (
    <div className="flex flex-col gap-2">
      <Typography className="text-left" variant="h2">
        Badge
      </Typography>
      <div className="flex w-full flex-wrap gap-2">
        <Badge>Badge</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
      <div className="flex w-full flex-wrap gap-2">
        <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
          <BadgeCheckIcon />
          Verified
        </Badge>
        <Badge className="h-5 min-w-5 rounded-full px-1 font-sans tabular-nums">8</Badge>
        <Badge
          className="h-5 min-w-5 rounded-full px-1 font-sans tabular-nums"
          variant="destructive"
        >
          99
        </Badge>
        <Badge className="h-5 min-w-5 rounded-full px-1 font-sans tabular-nums" variant="outline">
          20+
        </Badge>
      </div>
    </div>
  )
}

const SwitchSection = () => {
  return (
    <div className="space-y-2">
      <Typography className="text-left" variant="h2">
        Switch
      </Typography>
      <div className="flex items-center space-x-2">
        <Switch id="airplane-mode" />
        <Label htmlFor="airplane-mode">Airplane Mode</Label>
      </div>
    </div>
  )
}

const SelectSection = () => {
  return (
    <div className="flex flex-col space-y-2">
      <Typography className="text-left" variant="h2">
        Select
      </Typography>

      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
            <SelectItem value="grapes">Grapes</SelectItem>
            <SelectItem value="pineapple">Pineapple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

const SheetSection = () => {
  return (
    <div className="flex flex-col space-y-2">
      <Typography className="text-left" variant="h2">
        Sheet
      </Typography>
      <Sheet>
        <SheetTrigger className="w-fit" asChild>
          <Button variant="outline">Open</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>
              Make changes to your profile here. Click save when you&apos;re done.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <div className="grid gap-3">
              <Label htmlFor="sheet-demo-name">Name</Label>
              <Input id="sheet-demo-name" defaultValue="Pedro Duarte" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="sheet-demo-username">Username</Label>
              <Input id="sheet-demo-username" defaultValue="@peduarte" />
            </div>
          </div>
          <SheetFooter>
            <Button type="submit">Save changes</Button>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
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

const DropdownMenuSection = () => {
  return (
    <div className="flex flex-col space-y-2">
      <Typography className="text-left" variant="h2">
        Dropdown Menu
      </Typography>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-fit">
            Open
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Keyboard shortcuts
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Email</DropdownMenuItem>
                  <DropdownMenuItem>Message</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>More...</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem>
              New Team
              <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>GitHub</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuItem disabled>API</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const AvatarSection = () => {
  return (
    <div className="flex flex-col space-y-2">
      <Typography className="text-left" variant="h2">
        Avatar
      </Typography>
      <div className="flex flex-row flex-wrap items-center gap-12">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar className="rounded-lg">
          <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
          <AvatarFallback>ER</AvatarFallback>
        </Avatar>
        <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="https://github.com/leerob.png" alt="@leerob" />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  )
}

const BreadcrumbSection = () => {
  return (
    <div className="flex flex-col space-y-2">
      <Typography className="text-left" variant="h2">
        Breadcrumb
      </Typography>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="#">Home</a>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1">
                <BreadcrumbEllipsis className="size-4" />
                <span className="sr-only">Toggle menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Documentation</DropdownMenuItem>
                <DropdownMenuItem>Themes</DropdownMenuItem>
                <DropdownMenuItem>GitHub</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="#">Components</a>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
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

const TooltipSection = () => {
  return (
    <div className="flex flex-col space-y-2">
      <Typography className="text-left" variant="h2">
        Tooltip
      </Typography>
      <Tooltip>
        <TooltipTrigger className="w-fit" asChild>
          <Button>Hover</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add to library</p>
        </TooltipContent>
      </Tooltip>
    </div>
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
      <TooltipSection />
      <hr className="border border-secondary-100" />
      <ButtonSection />
      <hr className="border border-secondary-100" />
      <AvatarSection />
      <hr className="border border-secondary-100" />
      <CardSection />
      <hr className="border border-secondary-100" />
      <SelectSection />
      <hr className="border border-secondary-100" />
      <SheetSection />
      <hr className="border border-secondary-100" />
      <ComboBoxSection />
      <hr className="border border-secondary-100" />
      <DropdownMenuSection />
      <hr className="border border-secondary-100" />
      <SwitchSection />
      <hr className="border border-secondary-100" />
      <CommandSection />
      <hr className="border border-secondary-100" />
      <BreadcrumbSection />
      <hr className="border border-secondary-100" />
      <DialogSection />
      <hr className="border border-secondary-100" />
      <FormSection />
      <hr className="border border-secondary-100" />
      <InputSection />
      <hr className="border border-secondary-100" />
      <PopoverSection />
      <hr className="border border-secondary-100" />
      <BadgeSection />
    </div>
  )
}

export default PlaygroundPage
