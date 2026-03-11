import { createFormHook } from "@tanstack/react-form";

import {
	ComboboxField,
	FormCheckbox,
	PasswordTextField,
	Select,
	Slider,
	SubmitButton,
	Switch,
	TextArea,
	TextField,
} from "#/components/form-components";
import { fieldContext, formContext } from "./form-context";

export const { useAppForm } = createFormHook({
	fieldComponents: {
		TextField,
		ComboboxField,
		Select,
		TextArea,
		Switch,
		Slider,
		FormCheckbox,
		PasswordTextField,
	},
	formComponents: {
		SubmitButton,
	},
	fieldContext,
	formContext,
});
