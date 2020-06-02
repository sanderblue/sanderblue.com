<template>
  <div class="full-name wrapper font-bold">
    <span class="first-name">
      <span class="s">s</span>
      <span class="a">a</span>
      <span class="n">n</span>
      <span class="d">d</span>
      <span class="e">e</span>
      <span class="r">r</span>
    </span>
    <span class="last-name">
      <span class="b">b</span>
      <span class="l">l</span>
      <span class="u">u</span>
      <span class="e">e</span>
    </span>
  </div>
</template>

<style lang="scss" scoped>
@keyframes animateBubble {
  0% {
    top: 0%;
  }
  100% {
    margin-top: 10%;
  }
}

@keyframes sideWays {
  0% {
    left: -3%;
  }
  100% {
    left: 3%;
  }
}

// Styles copied from previous personal website
.full-name {
  font-size: 2rem;
  line-height: normal;
  width: inherit;
  color: rgba(245, 245, 245, 0.93);
  text-shadow: 1px 1px 3px rgba(20, 20, 20, 0.5);

  @media (min-width: 38rem) {
    font-size: 5rem;
  }

  .first-name,
  .last-name {
    position: relative;
    display: inline;
    letter-spacing: 0.2rem;

    span {
      position: relative;

      &:after {
        content: '';
        height: 0.5em;
        width: 0.5em;
        border: 1px solid #e6e6e6;
        border-radius: 50%;
        position: absolute;
        opacity: 0.5;
        animation: animateBubble 5s linear infinite,
          sideWays 2s ease-in-out infinite alternate;
      }

      &.s {
        &:after {
          height: 0.4em;
          width: 0.4em;
          top: 14%;
          right: -8%;
        }
      }

      &.a {
        &:after {
          display: none;
        }
      }

      &.n {
        &:after {
          height: 0.5em;
          width: 0.5em;
          bottom: 0;
          right: 45%;
        }
      }

      &.d {
        &:after {
          height: 0.75em;
          width: 0.75em;
          top: -45%;
          left: 40%;
        }
      }

      &.e {
        &:after {
          display: none;
        }
      }

      &.r {
        &:after {
          height: 0.3em;
          width: 0.3em;
          top: 35%;
          left: -25%;
        }
      }

      &.b {
        &:after {
          height: 0.6em;
          width: 0.6em;
          top: -15%;
          left: -20%;
        }
      }

      &.l {
        &:after {
          height: 0.8em;
          width: 0.8em;
          bottom: -10%;
          left: -15%;
        }
      }

      &.u {
        &:after {
          height: 0.5em;
          width: 0.5em;
          top: 8%;
          right: -10%;
        }
      }

      &.e {
        &:after {
          display: none;
        }
      }
    }
  }
}
</style>
