import type { ButtonHTMLAttributes, Ref } from 'react'

import styles from './Button.module.css'

export type TButtonVariant = 'soft' | 'secondary' | 'outline' | 'ghost' | 'link'

export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: TButtonVariant
    size?: 'sm' | 'md'
    ref?: Ref<HTMLButtonElement>
}

function Button({
    variant = 'secondary',
    size = 'md',
    type = 'button',
    className,
    ...rest
}: IButtonProps) {
    const classes = [styles.button, styles[size], styles[variant], className]
        .filter(Boolean)
        .join(' ')
    return <button type={type} className={classes} {...rest} />
}

export default Button
