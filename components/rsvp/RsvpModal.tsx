"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import
{
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { DialogDescription } from "@radix-ui/react-dialog"

export default function RsvpModal()
{
    const [step, setStep ] = useState(1);
    const [name, setName ] = useState("");
    const [loading, setLoading ] = useState(false);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);
    const handleSubmit = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from('guests')
            .insert([{ name }]);

        setLoading(false);

        if (error) {
            console.error("Error submitting RSVP:", error);
            return;
        }
        setStep(1);
        setName("");
    }

    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className="mt-8 px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition"
                    onClick={() => setIsOpen(true)}
                >
                    RSVP Now
                </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                    <DialogTitle className="text-center">RSVP</DialogTitle>
                    <DialogDescription>Step {step} of 3</DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="Your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="guests">Number of Guests</Label>
                            <Input id="guests" type="number" placeholder="0" />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="meal">Meal Preference</Label>
                            <Input id="meal" placeholder="e.g., Vegetarian" />
                        </div>
                    </div>
                )}

                <DialogFooter>
                        {step > 1 && <Button onClick={handleBack} className="mr-2">Back</Button>}
                        {step < 3 && <Button onClick={handleNext}>Next</Button>}
                        {step === 3 &&
                            <Button onClick={() => handleSubmit()} disabled={loading}>Submit</Button>
                        }
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );  
}